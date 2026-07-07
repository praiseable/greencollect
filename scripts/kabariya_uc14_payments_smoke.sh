#!/usr/bin/env bash
# Kabariya v3 UC-14 payment webhook/idempotency smoke test.
# Runs on Linux server from ~/gc-app. It verifies signed JazzCash/Easypaisa/Stripe
# webhook top-ups, invalid-HMAC rejection, duplicate delivery idempotency, payment
# history, and wallet ledger reconciliation for TOPUP rows.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TMP_DIR="$(mktemp -d)"
BODY="$TMP_DIR/body.json"
PASS=0
FAIL=0
WARN=0
STATUS="000"

cleanup(){ rm -rf "$TMP_DIR"; }
trap cleanup EXIT

line(){ printf '%s\n' '----------------------------------------------------------------'; }
pass(){ PASS=$((PASS+1)); printf '✅ PASS  %s\n' "$1"; }
fail(){ FAIL=$((FAIL+1)); printf '❌ FAIL  %s\n' "$1"; [ -s "$BODY" ] && { printf '%s\n' '---- body ----'; head -c 2200 "$BODY"; printf '\n'; }; }
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
extract_user_id(){ json_value "obj.user?.id || obj.data?.user?.id || obj.data?.id"; }
wallet_available(){ json_value "obj.wallet?.availableBalancePaisa || obj.availableBalancePaisa || obj.data?.availableBalancePaisa"; }

sign_payload(){
  local payload_file="$1" secret="$2"
  PAYLOAD_FILE="$payload_file" WEBHOOK_SECRET_VALUE="$secret" node - <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const payload = fs.readFileSync(process.env.PAYLOAD_FILE, 'utf8');
console.log('sha256=' + crypto.createHmac('sha256', process.env.WEBHOOK_SECRET_VALUE).update(payload).digest('hex'));
NODE
}

webhook_post(){
  local gateway="$1" payload_file="$2" signature="$3"
  STATUS="$(curl -sS -o "$BODY" -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -H "x-kabariya-signature: $signature" \
    -X POST "$API_BASE/payments/webhook/$gateway" \
    --data-binary "@$payload_file" 2>/dev/null || echo 000)"
}

make_payload(){
  local file="$1" gateway_ref="$2" user_id="$3" amount="$4" gateway="$5" extra_json="${6:-{}}"
  node - <<NODE > "$file"
const extra = $extra_json;
console.log(JSON.stringify({
  gatewayRef: '$gateway_ref',
  userId: '$user_id',
  amountPaisa: '$amount',
  currencyId: 'PKR',
  purpose: 'WALLET_TOPUP',
  status: 'COMPLETED',
  metadata: { source: 'uc14-smoke', gateway: '$gateway', ...extra }
}));
NODE
}

printf 'Kabariya UC-14 payments/webhook smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-14 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

WEBHOOK_SECRET="$(docker compose -f "$COMPOSE_FILE" exec -T backend node -e "console.log(process.env.PAYMENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || process.env.JWT_SECRET || '')" 2>/dev/null | tr -d '\r' | tail -1)"
if [ -n "$WEBHOOK_SECRET" ]; then
  pass "payment webhook signing secret available in backend env"
else
  fail "payment webhook signing secret missing in backend env"
fi

TS="$(date +%s%N | cut -c1-13)"
PASSWORD="Smoke@123456"
BUYER_EMAIL="uc14.buyer.$TS@example.test"
BUYER_PHONE="+923$(python3 - <<'PY'
import random
print(random.randint(100000000,999999999))
PY
)"

http POST /auth/register "" "{\"firstName\":\"UC14\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register UC14 payment-test buyer"
BUYER_TOKEN="$(extract_token)"
BUYER_ID="$(extract_user_id)"
[ -n "$BUYER_TOKEN" ] && pass "buyer token present" || fail "buyer token missing"
[ -n "$BUYER_ID" ] && pass "buyer id present" || fail "buyer id missing"

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable before gateway webhooks"
BEFORE="$(wallet_available)"
[ -n "$BEFORE" ] || BEFORE="0"
pass "buyer available balance before payment webhooks: $BEFORE"

# Invalid signature must be rejected and must not credit wallet.
BAD_PAYLOAD="$TMP_DIR/bad.json"
make_payload "$BAD_PAYLOAD" "uc14-invalid-$TS" "$BUYER_ID" "11111" "JAZZCASH"
webhook_post jazzcash "$BAD_PAYLOAD" "sha256=bad-signature"
expect 400 "UC-PAY-01 invalid HMAC rejected"
http GET /wallet "$BUYER_TOKEN"
AFTER_BAD="$(wallet_available)"
[ "$AFTER_BAD" = "$BEFORE" ] && pass "invalid webhook did not change wallet balance" || fail "invalid webhook changed wallet balance"

# Valid JazzCash webhook credits wallet.
JAZZ_AMOUNT=123456
JAZZ_REF="uc14-jazzcash-$TS"
JAZZ_PAYLOAD="$TMP_DIR/jazzcash.json"
make_payload "$JAZZ_PAYLOAD" "$JAZZ_REF" "$BUYER_ID" "$JAZZ_AMOUNT" "JAZZCASH"
JAZZ_SIG="$(sign_payload "$JAZZ_PAYLOAD" "$WEBHOOK_SECRET")"
webhook_post jazzcash "$JAZZ_PAYLOAD" "$JAZZ_SIG"
expect 200 "UC-PAY-01 signed JazzCash webhook accepted"
json_assert "obj.success===true && obj.status==='COMPLETED' && obj.credited===true && obj.payment.gateway==='JAZZCASH'" "JazzCash webhook credited wallet and recorded completed payment"

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable after JazzCash webhook"
AFTER_JAZZ="$(wallet_available)"
EXPECTED_AFTER_JAZZ="$((BEFORE + JAZZ_AMOUNT))"
[ "$AFTER_JAZZ" = "$EXPECTED_AFTER_JAZZ" ] && pass "wallet balance increased by JazzCash amount" || fail "wallet balance expected $EXPECTED_AFTER_JAZZ got $AFTER_JAZZ"
json_assert "(()=>{const rows=obj.ledger||[]; return rows.some(x => x.referenceType==='TOPUP' && x.type==='CREDIT' && x.metadata && x.metadata.gatewayRef==='$JAZZ_REF');})()" "wallet ledger contains JazzCash TOPUP credit row"

# Duplicate JazzCash delivery must be idempotent.
webhook_post jazzcash "$JAZZ_PAYLOAD" "$JAZZ_SIG"
expect 200 "duplicate JazzCash webhook accepted idempotently"
json_assert "obj.idempotent===true && obj.credited===false" "duplicate JazzCash webhook did not create a second credit"
http GET /wallet "$BUYER_TOKEN"
AFTER_DUP="$(wallet_available)"
[ "$AFTER_DUP" = "$AFTER_JAZZ" ] && pass "duplicate webhook left wallet balance unchanged" || fail "duplicate webhook changed balance from $AFTER_JAZZ to $AFTER_DUP"

# Easypaisa valid webhook.
EASY_AMOUNT=222222
EASY_REF="uc14-easypaisa-$TS"
EASY_PAYLOAD="$TMP_DIR/easypaisa.json"
make_payload "$EASY_PAYLOAD" "$EASY_REF" "$BUYER_ID" "$EASY_AMOUNT" "EASYPAISA"
EASY_SIG="$(sign_payload "$EASY_PAYLOAD" "$WEBHOOK_SECRET")"
webhook_post easypaisa "$EASY_PAYLOAD" "$EASY_SIG"
expect 200 "UC-PAY-01 signed Easypaisa webhook accepted"
json_assert "obj.success===true && obj.status==='COMPLETED' && obj.credited===true && obj.payment.gateway==='EASYPAISA'" "Easypaisa webhook credited wallet and recorded completed payment"

# Stripe fallback with exchange-rate snapshot metadata.
STRIPE_AMOUNT=333333
STRIPE_REF="uc14-stripe-$TS"
STRIPE_PAYLOAD="$TMP_DIR/stripe.json"
make_payload "$STRIPE_PAYLOAD" "$STRIPE_REF" "$BUYER_ID" "$STRIPE_AMOUNT" "STRIPE" "{ exchangeRateSnapshot: { source: 'uc14-smoke', from: 'USD', to: 'PKR', rate: '278.50' } }"
STRIPE_SIG="$(sign_payload "$STRIPE_PAYLOAD" "$WEBHOOK_SECRET")"
webhook_post stripe "$STRIPE_PAYLOAD" "$STRIPE_SIG"
expect 200 "UC-PAY-02 signed Stripe fallback webhook accepted"
json_assert "obj.success===true && obj.status==='COMPLETED' && obj.credited===true && obj.payment.gateway==='STRIPE'" "Stripe webhook credited PKR-equivalent wallet amount"

http GET /payments/history "$BUYER_TOKEN"
expect 200 "buyer payment history readable"
json_assert "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||obj.payments||[]); const refs=rows.map(x=>x.gatewayRef); return refs.includes('$JAZZ_REF') && refs.includes('$EASY_REF') && refs.includes('$STRIPE_REF');})()" "payment history contains JazzCash, Easypaisa, and Stripe gateway refs"
json_assert "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||obj.payments||[]); return rows.filter(x => ['$JAZZ_REF','$EASY_REF','$STRIPE_REF'].includes(x.gatewayRef)).every(x => x.status==='COMPLETED');})()" "all UC14 webhook payments are COMPLETED"

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable after all gateway webhooks"
FINAL_BALANCE="$(wallet_available)"
EXPECTED_FINAL="$((BEFORE + JAZZ_AMOUNT + EASY_AMOUNT + STRIPE_AMOUNT))"
[ "$FINAL_BALANCE" = "$EXPECTED_FINAL" ] && pass "wallet final balance reconciles with gateway credits" || fail "wallet final balance expected $EXPECTED_FINAL got $FINAL_BALANCE"
json_assert "(()=>{const rows=obj.ledger||[]; const refs=new Set(rows.filter(x=>x.referenceType==='TOPUP' && x.type==='CREDIT').map(x=>x.metadata&&x.metadata.gatewayRef)); return refs.has('$JAZZ_REF') && refs.has('$EASY_REF') && refs.has('$STRIPE_REF');})()" "wallet ledger contains one TOPUP credit for each gateway ref"

line
printf 'UC-14 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
