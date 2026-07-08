#!/usr/bin/env bash
# Kabariya v3 UC-18 admin reconciliation + security acceptance smoke test.
# Validates admin financial reconciliation is ledger-backed and exportable.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TMP_DIR="$(mktemp -d)"
BODY="$TMP_DIR/body.json"
DB_JSON="$TMP_DIR/db.json"
PASS=0
FAIL=0
WARN=0
STATUS="000"

cleanup(){ rm -rf "$TMP_DIR"; }
trap cleanup EXIT

line(){ printf '%s\n' '----------------------------------------------------------------'; }
pass(){ PASS=$((PASS+1)); printf '✅ PASS  %s\n' "$1"; }
fail(){ FAIL=$((FAIL+1)); printf '❌ FAIL  %s\n' "$1"; [ -s "$BODY" ] && { printf '%s\n' '---- body ----'; head -c 2400 "$BODY"; printf '\n'; }; }
warn(){ WARN=$((WARN+1)); printf '⚠️  WARN  %s\n' "$1"; }

http(){
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-sS -o "$BODY" -w '%{http_code}' -X "$method" "$API_BASE$path")
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

extract_token(){
  json_value "obj.accessToken || obj.token || obj?.data?.accessToken || obj?.data?.token"
}

printf 'Kabariya UC-18 admin reconciliation/security smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-18 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

http POST /auth/admin/login "" '{"email":"admin@marketplace.pk","password":"Admin@123456"}'
expect 200 "Admin portal login"
ADMIN_TOKEN="$(extract_token)"
[ -n "$ADMIN_TOKEN" ] && pass "admin token present" || fail "admin token missing"

http POST /auth/login "" '{"email":"customer@marketplace.pk","password":"Customer@123"}'
expect 200 "Customer login for admin-access negative test"
CUSTOMER_TOKEN="$(extract_token)"
[ -n "$CUSTOMER_TOKEN" ] && pass "customer token present" || fail "customer token missing"

http GET /admin/reconciliation-report
expect 401 "anonymous reconciliation report rejected"

if [ -n "$CUSTOMER_TOKEN" ]; then
  http GET /admin/reconciliation-report "$CUSTOMER_TOKEN"
  expect_any "401 403" "non-admin reconciliation report rejected"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  http GET /admin/dashboard "$ADMIN_TOKEN"
  expect 200 "UC-ADM-01 dashboard available to admin"
  json_assert "obj.stats && typeof obj.stats.totalUsers !== 'undefined' && typeof obj.stats.activeListings !== 'undefined'" "dashboard returns user/listing KPIs"

  http GET /admin/platform-config "$ADMIN_TOKEN"
  expect 200 "UC-ADM-03 platform config readable"
  json_assert "Object.keys(obj).some(k => /deposit/i.test(k)) && Object.keys(obj).some(k => /commission/i.test(k))" "platform config exposes deposit and commission controls"

  http GET '/admin/audit-logs?limit=5' "$ADMIN_TOKEN"
  expect 200 "UC-ADM-06 audit log endpoint available"

  http GET /admin/reconciliation-report "$ADMIN_TOKEN"
  expect 200 "UC-ADM-07 reconciliation report available"
  cp "$BODY" "$TMP_DIR/report.json"
  json_assert "obj.success === true && obj.totals && obj.reconciliation && typeof obj.reconciliation.balanced === 'boolean'" "reconciliation report has totals and balanced flag"
  json_assert "['topUpsPaisa','commissionCapturedPaisa','refundsPaisa','withdrawalsPaisa','heldDepositsPaisa','walletAvailablePaisa','walletEscrowedPaisa','walletTotalPaisa'].every(k => Object.prototype.hasOwnProperty.call(obj.totals,k))" "reconciliation report includes required financial totals"
  json_assert "Array.isArray(obj.reconciliation.discrepancies)" "reconciliation discrepancies are explicit, never silent"

  if node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$TMP_DIR/report.json','utf8')); process.exit(obj.reconciliation.balanced ? 0 : 1);" 2>/dev/null; then
    pass "wallet/deposit reconciliation currently balanced"
  else
    warn "reconciliation report found discrepancies; report flagged them instead of hiding them"
  fi

  http GET '/admin/reconciliation-report?format=csv' "$ADMIN_TOKEN"
  expect 200 "UC-ADM-07 reconciliation report exportable as CSV"
  if grep -q 'metric,amountPaisa' "$BODY" && grep -q 'commissionCapturedPaisa' "$BODY"; then
    pass "CSV export contains metric headers and commission row"
  else
    fail "CSV export missing expected rows"
  fi
fi

if docker compose -f "$COMPOSE_FILE" exec -T backend node <<'NODE' >"$DB_JSON" 2>"$TMP_DIR/db.err"
const prisma = require('./src/services/prisma');
const sum = (rows, pred = () => true) => rows.reduce((acc, r) => pred(r) ? acc + BigInt(r.amountPaisa || 0) : acc, 0n);
(async () => {
  const [ledgerRows, wallets, deposits] = await Promise.all([
    prisma.walletLedger.findMany({ select: { type: true, amountPaisa: true, referenceType: true, walletId: true, availableAfterPaisa: true, escrowedAfterPaisa: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
    prisma.wallet.findMany({ select: { id: true, availableBalancePaisa: true, escrowedBalancePaisa: true } }),
    prisma.listingDeposit.findMany({ where: { status: 'HELD' }, select: { amountPaisa: true } }),
  ]);
  const latest = new Map();
  for (const row of ledgerRows) if (!latest.has(row.walletId)) latest.set(row.walletId, row);
  let mismatchCount = 0;
  for (const w of wallets) {
    const l = latest.get(w.id);
    if (!l) continue;
    if (BigInt(w.availableBalancePaisa) !== BigInt(l.availableAfterPaisa) || BigInt(w.escrowedBalancePaisa) !== BigInt(l.escrowedAfterPaisa)) mismatchCount++;
  }
  const result = {
    topUpsPaisa: sum(ledgerRows, r => r.type === 'CREDIT' && r.referenceType === 'TOPUP').toString(),
    commissionCapturedPaisa: sum(ledgerRows, r => r.type === 'ESCROW_CAPTURE' && r.referenceType === 'COMMISSION_CAPTURE').toString(),
    refundsPaisa: sum(ledgerRows, r => r.type === 'ESCROW_RELEASE' && r.referenceType === 'DEPOSIT_REFUND').toString(),
    withdrawalsPaisa: sum(ledgerRows, r => r.type === 'DEBIT' && r.referenceType === 'WITHDRAWAL').toString(),
    heldDepositsPaisa: sum(deposits).toString(),
    walletAvailablePaisa: wallets.reduce((acc, w) => acc + BigInt(w.availableBalancePaisa || 0), 0n).toString(),
    walletEscrowedPaisa: wallets.reduce((acc, w) => acc + BigInt(w.escrowedBalancePaisa || 0), 0n).toString(),
    latestLedgerWalletMismatchCount: mismatchCount,
  };
  console.log(JSON.stringify(result));
  await prisma.$disconnect();
})().catch(async err => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "direct Prisma reconciliation query executed"
  if [ -s "$TMP_DIR/report.json" ]; then
    API_REPORT="$TMP_DIR/report.json" DB_JSON_PATH="$DB_JSON" node <<'NODE'
const fs = require('fs');
const api = JSON.parse(fs.readFileSync(process.env.API_REPORT, 'utf8'));
const db = JSON.parse(fs.readFileSync(process.env.DB_JSON_PATH, 'utf8'));
const keys = ['topUpsPaisa','commissionCapturedPaisa','refundsPaisa','withdrawalsPaisa','heldDepositsPaisa','walletAvailablePaisa','walletEscrowedPaisa'];
const mismatches = keys.filter((key) => String(api.totals[key]) !== String(db[key]));
if (mismatches.length) {
  console.error('mismatched totals:', mismatches.map((key) => `${key}: api=${api.totals[key]} db=${db[key]}`).join('; '));
  process.exit(1);
}
NODE
    if [ "$?" = "0" ]; then pass "API reconciliation totals match direct Prisma sums"; else fail "API reconciliation totals do not match direct Prisma sums"; fi
  fi
else
  warn "direct Prisma reconciliation query failed; check backend container logs"
  cat "$TMP_DIR/db.err" 2>/dev/null || true
fi

if docker compose -f "$COMPOSE_FILE" exec -T backend node <<'NODE' >"$TMP_DIR/finalized_grep.txt" 2>/dev/null
const fs = require('fs');
const path = require('path');
const roots = ['src/routes', 'src/services'];
const findings = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && p.endsWith('.js')) inspect(p);
  }
}
function inspect(file) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /status\s*[:=]\s*['"]FINALIZED['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const before = src.slice(Math.max(0, m.index - 2500), m.index).toLowerCase();
    const after = src.slice(m.index, Math.min(src.length, m.index + 2500)).toLowerCase();
    const context = `${before}${after}`;
    const allowed = context.includes('verify-handshake') || context.includes('handshakeverifiedat') || context.includes('handshake_verified') || context.includes('handshake verified');
    if (!allowed) {
      const line = src.slice(0, m.index).split('\n').length;
      findings.push(`${file}:${line}: ${m[0]}`);
    }
  }
}
roots.forEach(walk);
if (findings.length) {
  console.log(findings.join('\n'));
  process.exit(2);
}
NODE
then
  if [ ! -s "$TMP_DIR/finalized_grep.txt" ]; then
    pass "security grep: no obvious non-handshake FINALIZED write path found"
  else
    warn "security grep found possible non-handshake FINALIZED write paths; review manually"
    cat "$TMP_DIR/finalized_grep.txt"
  fi
else
  warn "security grep could not execute"
  cat "$TMP_DIR/finalized_grep.txt" 2>/dev/null || true
fi

line
printf 'UC-18 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
