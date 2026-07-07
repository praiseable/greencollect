#!/usr/bin/env bash
# Kabariya UC-19 security acceptance smoke.
# Runs on the Linux server from ~/gc-app. Read-only except for login calls.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TMP_DIR="$(mktemp -d)"
BODY="$TMP_DIR/body.json"
HEADERS="$TMP_DIR/headers.txt"
PASS=0
FAIL=0
WARN=0
STATUS="000"

cleanup(){ rm -rf "$TMP_DIR"; }
trap cleanup EXIT

line(){ printf '%s\n' '----------------------------------------------------------------'; }
pass(){ PASS=$((PASS+1)); printf '✅ PASS  %s\n' "$1"; }
fail(){ FAIL=$((FAIL+1)); printf '❌ FAIL  %s\n' "$1"; [ -s "$BODY" ] && { printf '%s\n' '---- body ----'; head -c 1800 "$BODY"; printf '\n'; }; }
warn(){ WARN=$((WARN+1)); printf '⚠️  WARN  %s\n' "$1"; }

http(){
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-sS -D "$HEADERS" -o "$BODY" -w '%{http_code}' -X "$method" "$API_BASE$path")
  if [ -n "$token" ]; then args+=(-H "Authorization: Bearer $token"); fi
  if [ -n "$data" ]; then args+=(-H 'Content-Type: application/json' -d "$data"); fi
  STATUS="$(curl "${args[@]}" 2>/dev/null || echo 000)"
}

expect(){
  local expected="$1" msg="$2"
  if [ "$STATUS" = "$expected" ]; then pass "$msg [$STATUS]"; else fail "$msg expected $expected got $STATUS"; fi
}

expect_any(){
  local allowed="$1" msg="$2"
  case " $allowed " in *" $STATUS "*) pass "$msg [$STATUS]" ;; *) fail "$msg expected one of {$allowed} got $STATUS" ;; esac
}

json_value(){
  local expr="$1"
  node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$BODY','utf8')); const v=($expr); if (v !== undefined && v !== null) console.log(v);" 2>/dev/null || true
}

json_assert(){
  local expr="$1" msg="$2"
  if node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$BODY','utf8')); if (!($expr)) process.exit(1);" 2>/dev/null; then
    pass "$msg"
  else
    fail "$msg"
  fi
}

extract_token(){ json_value "obj.accessToken || obj.token || obj?.data?.accessToken || obj?.data?.token"; }

container_node(){
  docker compose -f "$COMPOSE_FILE" exec -T backend node "$@"
}

printf 'Kabariya UC-19 security acceptance smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-19 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

NODE_VERSION="$(docker compose -f "$COMPOSE_FILE" exec -T backend node -v 2>/dev/null | tr -d '\r' || true)"
case "$NODE_VERSION" in v20.*) pass "backend Node runtime is v20.x ($NODE_VERSION)" ;; *) fail "backend Node runtime should be v20.x, got $NODE_VERSION" ;; esac

code="$(curl -sS -D "$HEADERS" -o "$BODY" -w '%{http_code}' "$BASE_URL/health" 2>/dev/null || echo 000)"
STATUS="$code"
expect 200 "GET /health"
json_assert "obj && obj.status === 'ok' && obj.db === 'connected'" "health reports status ok and db connected"

grep -qi '^x-content-type-options: nosniff' "$HEADERS" && pass "helmet header x-content-type-options is present" || warn "helmet x-content-type-options header missing on /health"
grep -qi '^content-security-policy:' "$HEADERS" && pass "helmet content-security-policy header is present" || warn "helmet content-security-policy header missing on /health"

http GET /wallet
expect 401 "protected wallet endpoint rejects anonymous caller"
http GET /admin/reconciliation-report
expect 401 "admin reconciliation rejects anonymous caller"

http POST /auth/login "" '{"email":"customer@marketplace.pk","password":"Customer@123"}'
expect 200 "seed customer login"
CUSTOMER_TOKEN="$(extract_token)"
[ -n "$CUSTOMER_TOKEN" ] && pass "customer token present" || fail "customer token missing"
if [ -n "$CUSTOMER_TOKEN" ]; then
  http GET /admin/reconciliation-report "$CUSTOMER_TOKEN"
  expect 403 "admin reconciliation rejects non-admin caller"
fi

http POST /auth/admin/login "" '{"email":"admin@marketplace.pk","password":"Admin@123456"}'
expect 200 "admin portal login"
ADMIN_TOKEN="$(extract_token)"
[ -n "$ADMIN_TOKEN" ] && pass "admin token present" || fail "admin token missing"

# Contact leak boundary: 200 with masked values is pass; 403 geofence is also pass if no contact data is leaked.
http GET '/listings?limit=5'
expect 200 "public listings available for contact-leak boundary"
LISTING_ID="$(json_value "(()=>{let rows=obj.data||obj.listings||obj; if(!Array.isArray(rows)&&rows) rows=rows.items||rows.data||[]; return Array.isArray(rows)&&rows[0] ? rows[0].id : '';})()")"
if [ -z "$LISTING_ID" ]; then
  warn "no listing available for contact-leak boundary"
else
  http GET "/listings/$LISTING_ID"
  if [ "$STATUS" = "200" ]; then
    pass "anonymous listing detail returned 200 for contact-leak boundary"
    json_assert "(()=>{const l=obj.listing||obj.data||obj; const vals=[l.contactNumber,l.sellerPhone,l.seller_phone,l.exactAddress,l.exact_address,l.address,l.latitude,l.longitude,l.seller&&l.seller.phone]; return vals.every(v=>v===null||v===undefined||v==='');})()" "anonymous listing detail has no non-empty contact/address/precise coordinate leak"
  elif [ "$STATUS" = "403" ]; then
    if grep -q 'GEO_FENCE_RESTRICTED' "$BODY"; then
      pass "anonymous listing detail may be geo-fenced before deposit without contact leak"
    else
      fail "anonymous listing detail returned unexpected 403"
    fi
  else
    fail "anonymous listing detail expected 200 or geo-fence 403 got $STATUS"
  fi
fi

# Static code checks inside backend container.
# Static checks write their own diagnostic files; clear the last HTTP body so failures do not dump unrelated listing JSON.
: > "$BODY"
if docker compose -f "$COMPOSE_FILE" exec -T backend node <<'NODE' >"$TMP_DIR/wallet_direct_updates.txt" 2>&1
const fs = require('fs');
const path = require('path');
const findings = [];
const allowed = new Set([
  path.normalize('src/services/wallet.service.js'),
]);
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file);
    else if (ent.isFile() && file.endsWith('.js')) inspect(file);
  }
}
function inspect(file) {
  const norm = path.normalize(file);
  if (allowed.has(norm)) return;
  const src = fs.readFileSync(file, 'utf8');
  const hasWalletUpdate = /prisma\.wallet\.update|wallet\.update\s*\(/.test(src);
  const hasBalanceMutation = /(availableBalancePaisa|escrowedBalancePaisa)\s*:/.test(src);
  if (hasWalletUpdate && hasBalanceMutation) findings.push(file);
}
walk('src');
if (findings.length) {
  console.log(findings.join('\n'));
  process.exit(2);
}
NODE
then
  pass "wallet balance updates appear centralized in wallet.service.js"
else
  fail "possible direct wallet balance updates outside wallet.service.js"
  cat "$TMP_DIR/wallet_direct_updates.txt"
fi

if docker compose -f "$COMPOSE_FILE" exec -T backend node <<'NODE' >"$TMP_DIR/finalized_paths.txt" 2>&1
const fs = require('fs');
const path = require('path');
const findings = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file);
    else if (ent.isFile() && file.endsWith('.js')) inspect(file);
  }
}
function inspect(file) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /status\s*[:=]\s*['"]FINALIZED['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const context = src.slice(Math.max(0, m.index - 3500), Math.min(src.length, m.index + 3500)).toLowerCase();
    const allowed = context.includes('verify-handshake') || context.includes('handshakeverifiedat') || context.includes('handshake_verified') || context.includes('handshake otp') || context.includes('verifyhandshake');
    if (!allowed) {
      const line = src.slice(0, m.index).split('\n').length;
      findings.push(`${file}:${line}: ${m[0]}`);
    }
  }
}
walk('src/routes');
walk('src/services');
if (findings.length) {
  console.log(findings.join('\n'));
  process.exit(2);
}
NODE
then
  pass "no obvious non-handshake FINALIZED write path found"
else
  fail "possible non-handshake FINALIZED write path found"
  cat "$TMP_DIR/finalized_paths.txt"
fi

if docker compose -f "$COMPOSE_FILE" exec -T backend node <<'NODE' >"$TMP_DIR/otp_sanitizer.txt" 2>&1
const fs = require('fs');
const file = 'src/routes/transactions.routes.js';
const src = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const mentionsHash = src.includes('handshakeOtpHash');
const hasSanitizer = /delete\s+[^;]*handshakeOtpHash|sanitizeTransaction|handshakeOtpHash\s*,\s*\.\.\./.test(src);
if (mentionsHash && !hasSanitizer) {
  console.log('handshakeOtpHash appears in transaction route without an obvious sanitizer/omit pattern');
  process.exit(2);
}
NODE
then
  pass "transaction route has no obvious handshakeOtpHash exposure pattern"
else
  warn "review transaction serializer for handshakeOtpHash exposure"
  cat "$TMP_DIR/otp_sanitizer.txt"
fi

if docker compose -f "$COMPOSE_FILE" exec -T backend node <<'NODE' >"$TMP_DIR/secrets.txt" 2>&1
const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const weak = required.filter((k) => !process.env[k] || process.env[k].length < 64);
if (weak.length) {
  console.log(`weak/missing secrets: ${weak.join(', ')}`);
  process.exit(2);
}
NODE
then
  pass "JWT secrets are present and at least 64 characters"
else
  fail "JWT secrets are missing or shorter than 64 characters"
  cat "$TMP_DIR/secrets.txt"
fi

if docker compose -f "$COMPOSE_FILE" exec -T backend sh -lc "grep -RInE 'console\\.(log|error|warn).*\\b(cnic|ntn|strn|handshakeOtp|otp)\\b' src 2>/dev/null || true" >"$TMP_DIR/sensitive_logs.txt" 2>/dev/null; then
  if [ -s "$TMP_DIR/sensitive_logs.txt" ]; then
    warn "possible sensitive-field logging found; review manually"
    cat "$TMP_DIR/sensitive_logs.txt"
  else
    pass "no obvious logging of CNIC/NTN/STRN/OTP fields found in src"
  fi
else
  warn "could not run sensitive logging grep"
fi

if docker compose -f "$COMPOSE_FILE" exec -T backend node <<'NODE' >"$TMP_DIR/seller_charges.txt" 2>&1
const fs = require('fs');
const path = require('path');
const findings = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file);
    else if (ent.isFile() && file.endsWith('.js')) inspect(file);
  }
}
function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }
function inspect(file) {
  const src = fs.readFileSync(file, 'utf8');
  const patterns = [
    /debitWallet(?:InTx)?\s*\([^
;]*(sellerId|seller\.id|sellerWallet|transaction\.sellerId)/gi,
    /creditWallet(?:InTx)?\s*\([^
;]*(sellerId|seller\.id|sellerWallet|transaction\.sellerId)[^
;]*(SUBSCRIPTION_PURCHASE|COMMISSION_CAPTURE)/gi,
    /sellerWallet[\s\S]{0,600}(availableBalancePaisa|escrowedBalancePaisa|SUBSCRIPTION_PURCHASE|COMMISSION_CAPTURE|type\s*:\s*['"]DEBIT['"])/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) findings.push(`${file}:${lineOf(src, m.index)}`);
  }
}
walk('src');
if (findings.length) {
  console.log([...new Set(findings)].join('\n'));
  process.exit(2);
}
NODE
then
  pass "no obvious seller-side commission/subscription debit pattern found"
else
  warn "possible seller-side charge pattern found; review manually"
  cat "$TMP_DIR/seller_charges.txt"
fi

line
printf 'UC-19 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
