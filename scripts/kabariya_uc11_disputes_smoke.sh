#!/usr/bin/env bash
# Kabariya v3 UC-11 disputes and ledger reversal smoke test.
# Creates a fresh buyer/seller/listing/finalized transaction, then opens and resolves a dispute.
# Verifies buyer-side commission reversal is ledger-backed and seller wallet is not charged.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TOPUP_PAISA="${TOPUP_PAISA:-2000000}"   # PKR 20,000
PRICE_PAISA="${PRICE_PAISA:-1000000}"   # PKR 10,000
ACTUAL_PRICE_PAISA="${ACTUAL_PRICE_PAISA:-1000000}"
EXPECTED_COMMISSION_PAISA="${EXPECTED_COMMISSION_PAISA:-50000}"
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

printf 'Kabariya UC-11 disputes/ledger-reversal smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-11 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

# Public security boundaries.
http GET /disputes
expect 401 "UC-DISP security: anonymous GET /disputes rejected"
http POST /disputes "" '{"transactionId":"fake","reason":"x"}'
expect 401 "UC-DISP security: anonymous POST /disputes rejected"

# Admin token.
http POST /auth/admin/login "" '{"email":"admin@marketplace.pk","password":"Admin@123456"}'
expect 200 "Admin portal login"
ADMIN_TOKEN="$(extract_token)"
[ -n "$ADMIN_TOKEN" ] && pass "admin token present" || fail "admin token missing"

# Seed IDs.
http GET /categories
expect 200 "GET /api/categories"
CATEGORY_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.categories||obj)[0]?.id")"
[ -n "$CATEGORY_ID" ] && pass "category id selected: $CATEGORY_ID" || fail "no category id found"

http GET /units
expect 200 "GET /api/units"
UNIT_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.units||obj)[0]?.id")"
[ -n "$UNIT_ID" ] && pass "unit id selected: $UNIT_ID" || fail "no unit id found"

TS="$(date +%s%N | cut -c1-13)"
SELLER_EMAIL="uc11.seller.$TS@example.test"
BUYER_EMAIL="uc11.buyer.$TS@example.test"
SELLER_PHONE="+923$(python3 - <<'PY'
import random
print(random.randint(100000000,999999999))
PY
)"
BUYER_PHONE="+923$(python3 - <<'PY'
import random
print(random.randint(100000000,999999999))
PY
)"
PASSWORD="Smoke@123456"

# Create participants.
http POST /auth/register "" "{\"firstName\":\"UC11\",\"lastName\":\"Seller\",\"email\":\"$SELLER_EMAIL\",\"phone\":\"$SELLER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register dispute seller"
SELLER_TOKEN="$(extract_token)"
[ -n "$SELLER_TOKEN" ] && pass "seller token present" || fail "seller token missing"

http POST /auth/register "" "{\"firstName\":\"UC11\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register dispute buyer"
BUYER_TOKEN="$(extract_token)"
[ -n "$BUYER_TOKEN" ] && pass "buyer token present" || fail "buyer token missing"

LISTING_BODY="{\"title\":\"UC11 Dispute Copper $TS\",\"description\":\"UC11 dispute smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC11 exact pickup address\",\"contactNumber\":\"$SELLER_PHONE\"}"
http POST /listings "$SELLER_TOKEN" "$LISTING_BODY"
expect 201 "seller creates listing for dispute transaction"
LISTING_ID="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
[ -n "$LISTING_ID" ] && pass "listing id: $LISTING_ID" || fail "listing id missing"

# Ledger-backed top-up.
if docker compose -f "$COMPOSE_FILE" exec -T \
  -e BUYER_EMAIL="$BUYER_EMAIL" \
  -e TOPUP_PAISA="$TOPUP_PAISA" \
  backend node <<'NODE' >/tmp/uc11_topup.out 2>/tmp/uc11_topup.err
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  if (!user) throw new Error('buyer not found');
  const wallet = await creditWallet(user.id, BigInt(process.env.TOPUP_PAISA), {
    referenceType: 'TOPUP',
    referenceId: `uc11-smoke-${Date.now()}`,
    note: 'UC11 smoke ledger top-up',
  });
  console.log(JSON.stringify({ userId: user.id, availableBalancePaisa: wallet.availableBalancePaisa.toString(), escrowedBalancePaisa: wallet.escrowedBalancePaisa.toString() }));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "buyer wallet credited through ledger service"
else
  fail "buyer wallet top-up failed"
  cat /tmp/uc11_topup.err 2>/dev/null || true
fi

# Deposit, offer, accept, amend, acknowledge, handshake, finalize.
http POST "/listings/$LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "buyer places deposit for dispute listing"

http POST /transactions "$BUYER_TOKEN" "{\"listingId\":\"$LISTING_ID\",\"offeredPricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"message\":\"UC11 funded offer\"}"
expect 201 "buyer submits funded offer"
TX_ID="$(json_value "obj.transaction?.id || obj.data?.transaction?.id")"
[ -n "$TX_ID" ] && pass "transaction id: $TX_ID" || fail "transaction id missing"

http PUT "/transactions/$TX_ID/accept" "$SELLER_TOKEN" "{}"
expect 200 "seller accepts dispute-test offer"

http POST "/transactions/$TX_ID/amend-weight" "$BUYER_TOKEN" "{\"actualQuantity\":10,\"actualPricePaisa\":\"$ACTUAL_PRICE_PAISA\"}"
expect 200 "buyer submits final actual price before dispute"

http POST "/transactions/$TX_ID/acknowledge-amendment" "$SELLER_TOKEN" "{}"
expect 200 "seller acknowledges final actual price"

http POST "/transactions/$TX_ID/handshake/generate" "$SELLER_TOKEN" "{}"
expect 200 "seller generates secure handshake OTP"
OTP="$(json_value "obj.otp || obj.data?.otp")"
if [ -z "$OTP" ]; then
  http GET "/notifications?limit=10" "$SELLER_TOKEN"
  if [ "$STATUS" = "200" ]; then
    OTP="$(node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$BODY','utf8')); const rows=obj.data||obj.notifications||[]; const text=JSON.stringify(rows); const m=text.match(/\\b(\\d{6})\\b/); if(m) console.log(m[1]);" 2>/dev/null || true)"
  fi
fi
[ -n "$OTP" ] && pass "seller-side OTP obtained" || fail "could not obtain seller OTP"

if [ -n "$OTP" ]; then
  http POST "/transactions/$TX_ID/verify-handshake" "$BUYER_TOKEN" "{\"otp\":\"$OTP\"}"
  expect 200 "buyer verifies handshake and finalizes"
  json_assert "(()=>{const t=obj.transaction||{}; return t.status === 'FINALIZED';})()" "transaction finalized before dispute"
  COMMISSION_PAISA="$(json_value "obj.capture?.commissionPaisa")"
  [ "$COMMISSION_PAISA" = "$EXPECTED_COMMISSION_PAISA" ] && pass "commission captured before dispute: $COMMISSION_PAISA" || warn "commission captured was ${COMMISSION_PAISA:-missing}; expected $EXPECTED_COMMISSION_PAISA with current settings"
fi

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable before dispute resolution"
BUYER_AVAILABLE_BEFORE="$(json_value "obj.wallet?.availableBalancePaisa || obj.data?.wallet?.availableBalancePaisa || obj.availableBalancePaisa")"
[ -n "$BUYER_AVAILABLE_BEFORE" ] && pass "buyer available balance before resolution: $BUYER_AVAILABLE_BEFORE" || warn "could not read buyer available balance before resolution"

# UC-TXN-05: participant raises dispute.
DISPUTE_BODY="{\"transactionId\":\"$TX_ID\",\"reason\":\"QUALITY_OR_WEIGHT_VARIANCE\",\"description\":\"UC11 smoke dispute after finalization\",\"evidence\":[{\"type\":\"note\",\"value\":\"smoke evidence\"}]}"
http POST /disputes "$BUYER_TOKEN" "$DISPUTE_BODY"
expect 201 "UC-TXN-05 buyer raises dispute"
DISPUTE_ID="$(json_value "obj.dispute?.id || obj.data?.dispute?.id")"
[ -n "$DISPUTE_ID" ] && pass "dispute id: $DISPUTE_ID" || fail "dispute id missing"

http POST /disputes "$BUYER_TOKEN" "$DISPUTE_BODY"
expect 409 "duplicate open dispute rejected"

http GET "/disputes/$DISPUTE_ID" "$SELLER_TOKEN"
expect 200 "seller can view participant dispute detail"

http GET "/disputes?status=OPEN&limit=50" "$ADMIN_TOKEN"
expect 200 "admin lists open disputes"
json_assert "(()=>{const rows=obj.data||obj.disputes||[]; return rows.some(d=>d.id==='$DISPUTE_ID');})()" "admin dispute queue contains new dispute"

# UC-DISP-01: admin resolves award_buyer and reverses buyer commission.
RESOLVE_BODY="{\"resolution\":\"award_buyer\",\"note\":\"UC11 smoke award buyer and reverse commission\"}"
http PATCH "/disputes/$DISPUTE_ID/resolve" "$ADMIN_TOKEN" "$RESOLVE_BODY"
expect 200 "UC-DISP-01 admin resolves dispute as award_buyer"
json_assert "(()=>{const d=obj.dispute||{}; return d.status === 'RESOLVED' && d.resolution === 'AWARD_BUYER';})()" "dispute status/resolution stored"
REVERSAL_TOTAL="$(json_value "obj.reversal?.totalReturnedPaisa || obj.dispute?.reversalAmountPaisa")"
[ "$REVERSAL_TOTAL" = "$EXPECTED_COMMISSION_PAISA" ] && pass "buyer commission reversal amount = $REVERSAL_TOTAL" || warn "buyer reversal amount was ${REVERSAL_TOTAL:-missing}; expected $EXPECTED_COMMISSION_PAISA"

http PATCH "/disputes/$DISPUTE_ID/resolve" "$ADMIN_TOKEN" "$RESOLVE_BODY"
expect 409 "resolved dispute cannot be resolved twice"

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable after dispute resolution"
json_assert "(()=>{const ledger=obj.ledger||obj.data?.ledger||[]; return ledger.some(x=>x.referenceType==='REVERSAL' && x.referenceId==='$DISPUTE_ID');})()" "wallet ledger contains auditable REVERSAL row for dispute"
BUYER_AVAILABLE_AFTER="$(json_value "obj.wallet?.availableBalancePaisa || obj.data?.wallet?.availableBalancePaisa || obj.availableBalancePaisa")"
if [ -n "$BUYER_AVAILABLE_BEFORE" ] && [ -n "$BUYER_AVAILABLE_AFTER" ]; then
  node -e "if (BigInt('$BUYER_AVAILABLE_AFTER') < BigInt('$BUYER_AVAILABLE_BEFORE') + BigInt('${REVERSAL_TOTAL:-0}')) process.exit(1)" 2>/dev/null \
    && pass "buyer available balance increased by reversal" \
    || fail "buyer available balance did not increase by reversal"
fi

http GET /wallet "$SELLER_TOKEN"
expect 200 "seller wallet readable after buyer-award dispute"
json_assert "(()=>{const ledger=obj.ledger||obj.data?.ledger||[]; return !ledger.some(x=>x.referenceId==='$DISPUTE_ID' && ['DEBIT','ESCROW_CAPTURE'].includes(x.type));})()" "seller wallet has no dispute debit/capture rows"

http GET "/notifications?limit=20" "$BUYER_TOKEN"
expect 200 "buyer notifications readable after dispute"
json_assert "(()=>{const rows=obj.data||obj.notifications||[]; return JSON.stringify(rows).toLowerCase().includes('dispute resolved');})()" "buyer receives dispute resolved notification"

http GET "/notifications?limit=20" "$SELLER_TOKEN"
expect 200 "seller notifications readable after dispute"
json_assert "(()=>{const rows=obj.data||obj.notifications||[]; return JSON.stringify(rows).toLowerCase().includes('dispute resolved');})()" "seller receives dispute resolved notification"

line
printf 'UC-11 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
