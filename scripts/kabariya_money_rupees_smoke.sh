#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="$BASE_URL/api"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PASS=0
FAIL=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass(){ PASS=$((PASS+1)); echo "âœ… PASS  $1"; }
fail(){ FAIL=$((FAIL+1)); echo "âŒ FAIL  $1"; [ -s "$TMP/body.json" ] && cat "$TMP/body.json" | head -c 1600; echo; }

request(){
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-sS -o "$TMP/body.json" -w "%{http_code}" -X "$method" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}" "$API_BASE$path" || echo 000
}

assert_code(){
  local code="$1" expected="$2" label="$3"
  if [ "$code" = "$expected" ]; then pass "$label [$expected]"; else fail "$label expected $expected got $code"; fi
}

assert_any(){
  local code="$1" expected_list="$2" label="$3"
  for e in $expected_list; do
    if [ "$code" = "$e" ]; then pass "$label [$code]"; return 0; fi
  done
  fail "$label expected one of [$expected_list] got $code"
}

json_assert(){
  local label="$1" js="$2"
  node -e "const fs=require('fs');const obj=JSON.parse(fs.readFileSync('$TMP/body.json','utf8')); if(!($js)) process.exit(1);" && pass "$label" || fail "$label"
}

extract(){
  node -e "const fs=require('fs');const obj=JSON.parse(fs.readFileSync('$TMP/body.json','utf8')); const v=($1); console.log(v == null ? '' : v);"
}

echo "Kabariya rupees-base smoke"
echo "API_BASE=$API_BASE COMPOSE_FILE=$COMPOSE_FILE"
echo "----------------------------------------------------------------"

code=$(request GET '/config/app-version')
assert_code "$code" 200 'config reachable'

code=$(curl -sS -o "$TMP/health.json" -w "%{http_code}" "$BASE_URL/health" || echo 000)
if [ "$code" = "200" ]; then
  if node -e "const fs=require('fs');const obj=JSON.parse(fs.readFileSync('$TMP/health.json','utf8')); process.exit(obj.moneyBaseUnit === 'rupees' ? 0 : 1)"; then
    pass 'health reports moneyBaseUnit=rupees'
  else
    fail 'health does not report moneyBaseUnit=rupees'
  fi
else
  fail "health expected 200 got $code"
fi

code=$(request GET '/currencies/PKR/format?amountRupees=1500&lang=en')
assert_code "$code" 200 'currency formatter accepts amountRupees'
json_assert '1500 rupees formats as PKR 1,500' "String(obj.amountRupees) === '1500' && /1,500/.test(obj.amountFormatted) && obj.moneyBaseUnit === 'rupees'"

# Strict rupees-mode API should reject legacy amountPaisa query input. This prevents future clients from sending paisa-scale values by mistake.
code=$(request GET '/currencies/PKR/format?amountPaisa=1500&lang=en')
assert_code "$code" 400 'legacy amountPaisa query input rejected in strict rupees mode'
json_assert 'legacy rejection explains amountRupees requirement' "obj.error && obj.error.code === 'INVALID_AMOUNT' && obj.moneyBaseUnit === 'rupees'"

STAMP="$(date +%s%N | cut -c1-13)"
SELLER_PHONE="+92379${STAMP: -7}"
BUYER_PHONE="+92378${STAMP: -7}"

code=$(request POST '/auth/register' "{\"firstName\":\"Rupees\",\"lastName\":\"Seller\",\"phone\":\"$SELLER_PHONE\",\"email\":\"rupees.seller.$STAMP@example.com\",\"password\":\"Test@123456\"}")
assert_code "$code" 201 'register rupee seller'
SELLER_TOKEN=$(extract "obj.accessToken || obj.token || obj.data?.accessToken")
[ -n "$SELLER_TOKEN" ] && pass 'seller token present' || fail 'seller token missing'

code=$(request POST '/auth/register' "{\"firstName\":\"Rupees\",\"lastName\":\"Buyer\",\"phone\":\"$BUYER_PHONE\",\"email\":\"rupees.buyer.$STAMP@example.com\",\"password\":\"Test@123456\"}")
assert_code "$code" 201 'register rupee buyer'
BUYER_TOKEN=$(extract "obj.accessToken || obj.token || obj.data?.accessToken")
[ -n "$BUYER_TOKEN" ] && pass 'buyer token present' || fail 'buyer token missing'

code=$(request GET '/categories')
assert_code "$code" 200 'categories available'
CATEGORY_ID=$(extract "(obj.data||obj.categories||obj)[0]?.id")
code=$(request GET '/units')
assert_code "$code" 200 'units available'
UNIT_ID=$(extract "(obj.data||obj.units||obj)[0]?.id")

code=$(request POST '/listings' "{\"title\":\"Rupee base listing $STAMP\",\"description\":\"Rupee base smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"priceRupees\":10000,\"quantity\":100,\"unitId\":\"$UNIT_ID\",\"latitude\":24.8607,\"longitude\":67.0011,\"address\":\"Rupee Smoke Address\",\"cityName\":\"Karachi\",\"contactNumber\":\"$SELLER_PHONE\",\"visibilityLevel\":\"PUBLIC\"}" "$SELLER_TOKEN")
assert_code "$code" 201 'seller creates listing using priceRupees=10000'
LISTING_ID=$(extract "obj.id || obj.listing?.id || obj.data?.id")
[ -n "$LISTING_ID" ] && pass "listing id present: $LISTING_ID" || fail 'listing id missing'
json_assert 'response exposes priceRupees alias' "String(obj.priceRupees || obj.listing?.priceRupees || obj.data?.priceRupees || obj.pricePaisa || obj.listing?.pricePaisa || obj.data?.pricePaisa) === '10000'"

if docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  docker compose -f "$COMPOSE_FILE" exec -T backend node - <<NODE
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async()=>{
 const user = await prisma.user.findUnique({ where: { phone: '$BUYER_PHONE' } });
 await creditWallet(user.id, 2000n, 'MANUAL_ADJUSTMENT', 'rupees-smoke-$STAMP', 'Rupee-base smoke credit', { source: 'rupees-smoke', moneyBaseUnit: 'rupees' });
 await prisma.\$disconnect();
})().catch(async e=>{ console.error(e); await prisma.\$disconnect(); process.exit(1); });
NODE
  pass 'buyer wallet credited 2000 rupees through wallet service'
else
  fail 'docker compose not available for wallet credit'
fi

# Correct backend deposit endpoint is /listings/:id/deposit.
code=$(request POST "/listings/$LISTING_ID/deposit" '{}' "$BUYER_TOKEN")
assert_any "$code" '200 201' 'buyer places deposit on rupee listing'
json_assert 'deposit is 5% of 10,000 rupees = 500 rupees' "String(obj.requiredDepositRupees || obj.deposit?.amountRupees || obj.amountRupees || obj.requiredDepositPaisa || obj.deposit?.amountPaisa || obj.amountPaisa) === '500'"

code=$(request GET "/listings/$LISTING_ID" '' "$BUYER_TOKEN")
assert_code "$code" 200 'buyer listing detail after rupee deposit'
json_assert 'post-deposit buyer can see seller contact/address' "(()=>{const l=obj.listing||obj.data||obj; return !!(l.contactNumber || l.address || l.sellerPhone || l.exactAddress || (l.seller&&l.seller.phone));})()"

echo "----------------------------------------------------------------"
echo "Rupees-base smoke summary: PASSED=$PASS FAILED=$FAIL"
[ "$FAIL" -eq 0 ]