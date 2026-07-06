#!/usr/bin/env bash
# Kabariya v3 UC-5..UC-9 deal-flow smoke test.
# Runs on the Linux server from ~/gc-app. Creates test users/listing/transaction.
# It credits the buyer wallet through the backend wallet service inside the backend container,
# then uses public API calls to validate deposit, contact unlock, offer, acceptance,
# amendment, Secure Handshake finalization, commission capture, and bond creation.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TOPUP_PAISA="${TOPUP_PAISA:-2000000}"   # PKR 20,000
PRICE_PAISA="${PRICE_PAISA:-1000000}"   # PKR 10,000
ACTUAL_PRICE_PAISA="${ACTUAL_PRICE_PAISA:-1000000}"
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
fail(){ FAIL=$((FAIL+1)); printf '❌ FAIL  %s\n' "$1"; [ -s "$BODY" ] && { printf '%s\n' '---- body ----'; head -c 2000 "$BODY"; printf '\n'; }; }
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

printf 'Kabariya UC-5..UC-9 deal-flow smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'Summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

# Seed IDs
http GET /categories
expect 200 "GET /api/categories"
CATEGORY_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.categories||obj)[0]?.id")"
[ -n "$CATEGORY_ID" ] && pass "category id selected: $CATEGORY_ID" || fail "no category id found"

http GET /units
expect 200 "GET /api/units"
UNIT_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.units||obj)[0]?.id")"
[ -n "$UNIT_ID" ] && pass "unit id selected: $UNIT_ID" || fail "no unit id found"

TS="$(date +%s%N | cut -c1-13)"
SELLER_EMAIL="uc5.seller.$TS@example.test"
BUYER_EMAIL="uc5.buyer.$TS@example.test"
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

# UC-2/AUTH prerequisite: register two verified users
http POST /auth/register "" "{\"firstName\":\"UC5\",\"lastName\":\"Seller\",\"email\":\"$SELLER_EMAIL\",\"phone\":\"$SELLER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register seller"
SELLER_TOKEN="$(extract_token)"
[ -n "$SELLER_TOKEN" ] && pass "seller token present" || fail "seller token missing"

http POST /auth/register "" "{\"firstName\":\"UC5\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register buyer"
BUYER_TOKEN="$(extract_token)"
[ -n "$BUYER_TOKEN" ] && pass "buyer token present" || fail "buyer token missing"

# UC-LIST-01: free seller listing creation with real private contact/address fields
LISTING_BODY="{\"title\":\"UC5 Copper Scrap $TS\",\"description\":\"UC5-UC9 smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC smoke exact pickup address\",\"contactNumber\":\"$SELLER_PHONE\"}"
http POST /listings "$SELLER_TOKEN" "$LISTING_BODY"
expect 201 "UC-LIST-01 seller creates free listing"
LISTING_ID="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
[ -n "$LISTING_ID" ] && pass "listing id: $LISTING_ID" || fail "listing id missing"

# UC-CHAT-01 pre-deposit boundary: private fields must be null/masked.
# LOCAL/territory listings may return 403 for anonymous users. That is acceptable
# as long as the response body does not leak contact/address data. If the listing
# detail is visible, assert masked values explicitly.
http GET "/listings/$LISTING_ID"
if [ "$STATUS" = "200" ]; then
  pass "anonymous listing detail before deposit [200]"
  json_assert "(()=>{const l=obj.listing||obj.data||obj; return !l.contactNumber && !l.address && !l.sellerPhone && !l.exactAddress && !(l.seller&&l.seller.phone) && l.latitude == null && l.longitude == null;})()" "pre-deposit listing response masks phone/address/precise coordinates"
elif [ "$STATUS" = "403" ]; then
  json_assert "(obj.error||{}).code === 'GEO_FENCE_RESTRICTED'" "anonymous listing detail blocked by geo-fence before deposit without contact leak"
else
  fail "anonymous listing detail before deposit expected 200 or geo-fence 403 got $STATUS"
fi

# UC-WAL-01: top up buyer via ledger-backed service inside backend container.
if docker compose -f "$COMPOSE_FILE" exec -T \
  -e BUYER_EMAIL="$BUYER_EMAIL" \
  -e TOPUP_PAISA="$TOPUP_PAISA" \
  backend node <<'NODE' >/tmp/uc5_topup.out 2>/tmp/uc5_topup.err
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  if (!user) throw new Error('buyer not found');
  const wallet = await creditWallet(user.id, BigInt(process.env.TOPUP_PAISA), {
    referenceType: 'TOPUP',
    referenceId: `uc5-smoke-${Date.now()}`,
    note: 'UC5 smoke ledger top-up',
  });
  console.log(JSON.stringify({ userId: user.id, availableBalancePaisa: wallet.availableBalancePaisa.toString(), escrowedBalancePaisa: wallet.escrowedBalancePaisa.toString() }));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "UC-WAL-01 buyer wallet credited through ledger service"
else
  fail "UC-WAL-01 buyer wallet top-up failed"
  cat /tmp/uc5_topup.err 2>/dev/null || true
fi

# UC-WAL-02: buyer deposit hold unlocks contact
http POST "/listings/$LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "UC-WAL-02 buyer places deposit"
DEPOSIT_ID="$(json_value "obj.deposit?.id || obj.data?.deposit?.id")"
REQUIRED_DEPOSIT="$(json_value "obj.requiredDepositPaisa || obj.data?.requiredDepositPaisa || obj.deposit?.amountPaisa")"
[ -n "$DEPOSIT_ID" ] && pass "deposit id: $DEPOSIT_ID" || fail "deposit id missing"
[ "$REQUIRED_DEPOSIT" = "50000" ] && pass "deposit formula max(5% of 1000000, 50000) = 50000" || warn "deposit was $REQUIRED_DEPOSIT; check settings/subscription override"

http GET "/listings/$LISTING_ID" "$BUYER_TOKEN"
expect 200 "buyer listing detail after deposit"
json_assert "(()=>{const l=obj.listing||obj.data||obj; return !!(l.contactNumber || l.address || l.sellerPhone || l.exactAddress || (l.seller&&l.seller.phone));})()" "post-deposit buyer can see seller contact/address"

http GET /wallet "$BUYER_TOKEN"
expect 200 "UC-WAL-07 buyer wallet history"
json_assert "(()=>{const ledger=obj.ledger||obj.data?.ledger||[]; return ledger.some(x=>x.type==='CREDIT') && ledger.some(x=>x.type==='ESCROW_HOLD');})()" "wallet ledger contains CREDIT and ESCROW_HOLD rows"

# UC-OFFER-01/02 and UC-TXN-01
OFFER_BODY="{\"listingId\":\"$LISTING_ID\",\"offeredPricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"message\":\"UC5 funded offer\"}"
http POST /transactions "$BUYER_TOKEN" "$OFFER_BODY"
expect 201 "UC-OFFER-01 buyer submits funded offer"
TX_ID="$(json_value "obj.transaction?.id || obj.data?.transaction?.id")"
[ -n "$TX_ID" ] && pass "transaction id: $TX_ID" || fail "transaction id missing"

http PUT "/transactions/$TX_ID/accept" "$SELLER_TOKEN" "{}"
expect 200 "UC-OFFER-02 seller accepts offer"
json_assert "(obj.transaction||obj.data?.transaction||{}).status === 'ACCEPTED'" "UC-TXN-01 transaction status ACCEPTED"

http PUT "/transactions/$TX_ID/finalize" "$BUYER_TOKEN" "{}"
expect 409 "UC-TXN-04 direct finalize is blocked"

# UC-TXN-06 amendment and seller acknowledgement
http POST "/transactions/$TX_ID/amend-weight" "$BUYER_TOKEN" "{\"actualQuantity\":10,\"actualPricePaisa\":\"$ACTUAL_PRICE_PAISA\"}"
expect 200 "UC-TXN-06 buyer submits post-weighing amendment"
json_assert "(obj.transaction||{}).verificationStatus === 'AMENDED' || (obj.transaction||{}).verification_status === 'AMENDED' || (obj.transaction||{}).verificationStatus === 'amended'" "transaction verification status AMENDED"

http POST "/transactions/$TX_ID/acknowledge-amendment" "$SELLER_TOKEN" "{}"
expect 200 "UC-TXN-06 seller acknowledges amendment"

# UC-TXN-07 handshake OTP generation and verification. OTP is returned only if test env allows it;
# otherwise read seller notification because the API deliberately sends plaintext OTP only to seller.
http POST "/transactions/$TX_ID/handshake/generate" "$SELLER_TOKEN" "{}"
expect 200 "UC-TXN-07 seller generates handshake OTP"
OTP="$(json_value "obj.otp || obj.data?.otp")"
if [ -z "$OTP" ]; then
  http GET "/notifications?limit=10" "$SELLER_TOKEN"
  if [ "$STATUS" = "200" ]; then
    OTP="$(node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$BODY','utf8')); const rows=obj.data||obj.notifications||[]; const text=JSON.stringify(rows); const m=text.match(/\\b(\\d{6})\\b/); if(m) console.log(m[1]);" 2>/dev/null || true)"
  fi
fi
[ -n "$OTP" ] && pass "seller-side OTP obtained for smoke verification" || fail "could not obtain seller OTP from response or seller notifications"

if [ -n "$OTP" ]; then
  http POST "/transactions/$TX_ID/verify-handshake" "$BUYER_TOKEN" "{\"otp\":\"$OTP\"}"
  expect 200 "UC-TXN-07 buyer verifies OTP and finalizes"
  json_assert "(()=>{const t=obj.transaction||obj.data?.transaction||{}; return t.status === 'FINALIZED' && (t.verificationStatus === 'FINALIZED' || t.verification_status === 'FINALIZED');})()" "transaction finalized only through handshake"
  json_assert "!!(obj.capture && obj.capture.commissionPaisa)" "UC-WAL-04 commission capture returned"
fi

# UC-BOND-01
http GET "/transactions/$TX_ID/bond" "$BUYER_TOKEN"
expect 200 "UC-BOND-01 finalized transaction bond exists"
json_assert "!!(obj.bond || obj.data?.bond)" "bond payload present"

# Seller wallet should not be charged.
http GET /wallet "$SELLER_TOKEN"
expect 200 "seller wallet readable"
json_assert "(()=>{const w=obj.wallet||obj.data?.wallet||{}; const avail=BigInt(w.availableBalancePaisa||w.balancePaisa||0); const esc=BigInt(w.escrowedBalancePaisa||0); const ledger=obj.ledger||[]; return avail >= 0n && esc >= 0n && !ledger.some(x=>x.referenceType==='COMMISSION_CAPTURE' || x.type==='ESCROW_CAPTURE');})()" "seller wallet has no commission capture/debit rows"

line
printf 'UC-5..UC-9 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
