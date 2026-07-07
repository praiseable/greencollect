#!/usr/bin/env bash
# Kabariya v3 UC-16 analytics smoke.
# Validates seller analytics remain free and buyer analytics are tier-aware.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PRICE_PAISA="${PRICE_PAISA:-2000000}"
TOPUP_PAISA="${TOPUP_PAISA:-1000000}"
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

printf 'Kabariya UC-16 analytics/reporting smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s PRICE_PAISA=%s\n' "$API_BASE" "$COMPOSE_FILE" "$PRICE_PAISA"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-16 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

http GET /analytics/seller
expect 401 "UC-ANL security: anonymous seller analytics rejected"

http POST /auth/admin/login "" '{"email":"admin@marketplace.pk","password":"Admin@123456"}'
expect 200 "Admin portal login"
ADMIN_TOKEN="$(extract_token)"
[ -n "$ADMIN_TOKEN" ] && pass "admin token present" || fail "admin token missing"

http GET /analytics/overview "$ADMIN_TOKEN"
expect 200 "admin platform analytics overview"

http GET /categories
expect 200 "GET /api/categories"
CATEGORY_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.categories||obj)[0]?.id")"
[ -n "$CATEGORY_ID" ] && pass "category id selected: $CATEGORY_ID" || fail "no category id found"

http GET /units
expect 200 "GET /api/units"
UNIT_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.units||obj)[0]?.id")"
[ -n "$UNIT_ID" ] && pass "unit id selected: $UNIT_ID" || fail "no unit id found"

TS="$(date +%s%N | cut -c1-13)"
SELLER_EMAIL="uc16.seller.$TS@example.test"
BUYER_EMAIL="uc16.buyer.$TS@example.test"
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

http POST /auth/register "" "{\"firstName\":\"UC16\",\"lastName\":\"Seller\",\"email\":\"$SELLER_EMAIL\",\"phone\":\"$SELLER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register analytics seller"
SELLER_TOKEN="$(extract_token)"
[ -n "$SELLER_TOKEN" ] && pass "seller token present" || fail "seller token missing"

http POST /auth/register "" "{\"firstName\":\"UC16\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register analytics buyer"
BUYER_TOKEN="$(extract_token)"
[ -n "$BUYER_TOKEN" ] && pass "buyer token present" || fail "buyer token missing"

http GET /analytics/overview "$BUYER_TOKEN"
expect 403 "non-admin cannot access platform analytics overview"

http GET /analytics/seller "$SELLER_TOKEN"
expect 200 "UC-ANL-01 seller analytics available before any subscription"
json_assert "obj.sellerFree===true && obj.requiresSubscription===false && obj.paywall===false" "seller analytics is free and not subscription-gated"

http POST /listings "$SELLER_TOKEN" "{\"title\":\"UC16 Analytics Listing $TS\",\"description\":\"UC16 seller analytics smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC16 exact pickup address\",\"contactNumber\":\"$SELLER_PHONE\"}"
expect 201 "seller creates listing for analytics"
LISTING_ID="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
[ -n "$LISTING_ID" ] && pass "listing id: $LISTING_ID" || fail "listing id missing"

http GET /analytics/seller "$SELLER_TOKEN"
expect 200 "seller analytics after listing creation"
json_assert "obj.listingStats && obj.listingStats.totalListings >= 1 && obj.listingStats.activeListings >= 1" "seller analytics counts own listings"
json_assert "obj.sellerFree===true && obj.paywall===false" "seller analytics remains free after listing"

http GET /analytics/buyer "$BUYER_TOKEN"
expect 200 "UC-ANL-02 base buyer analytics available"
json_assert "obj.tier==='BASIC' && obj.premiumAnalyticsUnlocked===false && obj.currentDeposits && obj.transactionHistory" "base buyer analytics includes current deposits and transaction history only"
json_assert "obj.premiumAnalytics===null && obj.upgradePrompt && obj.upgradePrompt.available===true" "base buyer advanced analytics are gated with upgrade prompt"

# Top up buyer through the ledger service inside backend container.
if docker compose -f "$COMPOSE_FILE" exec -T \
  -e BUYER_EMAIL="$BUYER_EMAIL" \
  -e TOPUP_PAISA="$TOPUP_PAISA" \
  backend node <<'NODE' >/tmp/uc16_topup.out 2>/tmp/uc16_topup.err
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  if (!user) throw new Error('buyer not found');
  const wallet = await creditWallet(user.id, BigInt(process.env.TOPUP_PAISA), {
    referenceType: 'TOPUP',
    referenceId: `uc16-smoke-${Date.now()}`,
    note: 'UC16 smoke ledger top-up',
  });
  console.log(JSON.stringify({ userId: user.id, availableBalancePaisa: wallet.availableBalancePaisa.toString() }));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "buyer wallet credited for analytics deposit"
else
  fail "buyer wallet top-up failed"
  cat /tmp/uc16_topup.err 2>/dev/null || true
fi

http POST "/listings/$LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "buyer places deposit for analytics listing"

http GET /analytics/seller "$SELLER_TOKEN"
expect 200 "seller analytics after buyer deposit"
json_assert "obj.listingStats && obj.listingStats.depositsPlaced >= 1 && BigInt(obj.listingStats.depositAmountPaisa || 0) > 0n" "seller analytics includes deposits placed on seller listings"

http GET /analytics/buyer "$BUYER_TOKEN"
expect 200 "buyer analytics after active deposit"
json_assert "obj.currentDeposits && obj.currentDeposits.count >= 1 && BigInt(obj.currentDeposits.amountPaisa || 0) > 0n" "buyer analytics includes active deposit count and amount"

http GET /subscriptions/plans
expect 200 "public buyer premium plans available"
PRO_PLAN_ID="$(json_value "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||[]); return (rows.find(p=>String(p.slug).includes('pro-buyer') || /pro buyer/i.test(p.name))||{}).id;})()")"
PRO_PRICE="$(json_value "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||[]); const p=rows.find(p=>p.id==='$PRO_PLAN_ID')||{}; const price=(p.prices||[]).find(x=>x.interval==='MONTHLY') || (p.prices||[])[0] || {}; return price.pricePaisa;})()")"
[ -n "$PRO_PLAN_ID" ] && pass "Pro buyer analytics plan selected: $PRO_PLAN_ID" || fail "Pro buyer plan missing"

http POST /subscriptions/subscribe "$BUYER_TOKEN" "{\"planId\":\"$PRO_PLAN_ID\",\"interval\":\"MONTHLY\",\"currencyId\":\"PKR\"}"
expect 200 "buyer purchases Pro plan for premium analytics"

http GET /analytics/buyer "$BUYER_TOKEN"
expect 200 "buyer premium analytics after Pro subscription"
json_assert "(obj.tier==='PRO' || obj.tier==='ENTERPRISE') && obj.premiumAnalyticsUnlocked===true && obj.premiumAnalytics && Array.isArray(obj.premiumAnalytics.categoryTrends)" "premium buyer analytics unlocks category trends payload"
json_assert "obj.upgradePrompt===null" "premium buyer analytics removes upgrade prompt"

line
printf 'UC-16 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
