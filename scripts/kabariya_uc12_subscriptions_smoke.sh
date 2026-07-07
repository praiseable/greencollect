#!/usr/bin/env bash
# Kabariya v3 UC-12 buyer subscriptions smoke test.
# Runs on the Linux server from ~/gc-app. Creates fresh buyer/seller accounts,
# verifies seller listing remains free, purchases a buyer-only premium plan from
# wallet balance, and proves the plan changes only future deposit calculations.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PRICE_PAISA="${PRICE_PAISA:-5000000}"       # PKR 50,000; base 5%=250,000, Pro 3%=150,000
TOPUP_PAISA="${TOPUP_PAISA:-2000000}"       # PKR 20,000 enough for subscription + deposits
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

printf 'Kabariya UC-12 buyer subscriptions smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s PRICE_PAISA=%s\n' "$API_BASE" "$COMPOSE_FILE" "$PRICE_PAISA"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-12 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

http GET /subscriptions/plans
expect 200 "UC-SUB-01 public buyer premium plans available"
json_assert "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||[]); return rows.length>=2 && rows.every(p => p.buyerPremium === true && p.sellerVisible === false && p.audience === 'BUYER');})()" "plans are buyer-only and hidden from seller-only flows"
PRO_PLAN_ID="$(json_value "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||[]); return (rows.find(p=>String(p.slug).includes('pro-buyer') || /pro buyer/i.test(p.name))||{}).id;})()")"
[ -n "$PRO_PLAN_ID" ] && pass "Pro buyer plan selected: $PRO_PLAN_ID" || fail "Pro buyer plan missing"
PRO_PRICE="$(json_value "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||[]); const p=rows.find(p=>p.id==='$PRO_PLAN_ID')||{}; const price=(p.prices||[]).find(x=>x.interval==='MONTHLY') || (p.prices||[])[0] || {}; return price.pricePaisa;})()")"
[ -n "$PRO_PRICE" ] && pass "Pro buyer monthly price found: $PRO_PRICE" || fail "Pro buyer price missing"

http GET /categories
expect 200 "GET /api/categories"
CATEGORY_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.categories||obj)[0]?.id")"
[ -n "$CATEGORY_ID" ] && pass "category id selected: $CATEGORY_ID" || fail "no category id found"

http GET /units
expect 200 "GET /api/units"
UNIT_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.units||obj)[0]?.id")"
[ -n "$UNIT_ID" ] && pass "unit id selected: $UNIT_ID" || fail "no unit id found"

TS="$(date +%s%N | cut -c1-13)"
SELLER_EMAIL="uc12.seller.$TS@example.test"
BUYER_EMAIL="uc12.buyer.$TS@example.test"
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

http POST /auth/register "" "{\"firstName\":\"UC12\",\"lastName\":\"Seller\",\"email\":\"$SELLER_EMAIL\",\"phone\":\"$SELLER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register subscription-test seller"
SELLER_TOKEN="$(extract_token)"
[ -n "$SELLER_TOKEN" ] && pass "seller token present" || fail "seller token missing"

http POST /auth/register "" "{\"firstName\":\"UC12\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register subscription-test buyer"
BUYER_TOKEN="$(extract_token)"
[ -n "$BUYER_TOKEN" ] && pass "buyer token present" || fail "buyer token missing"

# Seller-free rule: seller creates listings before any wallet top-up or subscription.
create_listing(){
  local title="$1"
  local token="$2"
  local body="{\"title\":\"$title\",\"description\":\"UC12 buyer subscription smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC12 exact pickup address\",\"contactNumber\":\"$SELLER_PHONE\"}"
  http POST /listings "$token" "$body"
}

create_listing "UC12 Base Deposit $TS" "$SELLER_TOKEN"
expect 201 "seller creates listing with no subscription/wallet gate"
LISTING_BASE="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
[ -n "$LISTING_BASE" ] && pass "base listing id: $LISTING_BASE" || fail "base listing id missing"

# Top up buyer through the ledger service inside the backend container.
if docker compose -f "$COMPOSE_FILE" exec -T \
  -e BUYER_EMAIL="$BUYER_EMAIL" \
  -e TOPUP_PAISA="$TOPUP_PAISA" \
  backend node <<'NODE' >/tmp/uc12_topup.out 2>/tmp/uc12_topup.err
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  if (!user) throw new Error('buyer not found');
  const wallet = await creditWallet(user.id, BigInt(process.env.TOPUP_PAISA), {
    referenceType: 'TOPUP',
    referenceId: `uc12-smoke-${Date.now()}`,
    note: 'UC12 smoke ledger top-up',
  });
  console.log(JSON.stringify({ userId: user.id, availableBalancePaisa: wallet.availableBalancePaisa.toString() }));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "buyer wallet credited through ledger service"
else
  fail "buyer wallet top-up failed"
  cat /tmp/uc12_topup.err 2>/dev/null || true
fi

http GET /subscriptions/my "$BUYER_TOKEN"
expect 200 "buyer subscription initially readable"
json_assert "obj === null || obj.status !== 'ACTIVE'" "buyer starts without active paid subscription"

http POST "/listings/$LISTING_BASE/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "base-tier buyer places deposit normally"
BASE_DEPOSIT="$(json_value "obj.requiredDepositPaisa || obj.deposit?.amountPaisa")"
if [ "$BASE_DEPOSIT" = "250000" ]; then pass "base tier deposit is 5% of 5,000,000 = 250000"; else fail "base deposit expected 250000 got ${BASE_DEPOSIT:-missing}"; fi

create_listing "UC12 Pro Deposit $TS" "$SELLER_TOKEN"
expect 201 "seller creates second listing after buyer base deposit"
LISTING_PRO="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
[ -n "$LISTING_PRO" ] && pass "pro listing id: $LISTING_PRO" || fail "pro listing id missing"

http POST /subscriptions/subscribe "$BUYER_TOKEN" "{\"planId\":\"$PRO_PLAN_ID\",\"interval\":\"MONTHLY\",\"currencyId\":\"PKR\"}"
expect 200 "UC-SUB-01 buyer purchases Pro plan from wallet"
json_assert "(()=>{const sub=obj.subscription||{}; return sub.status==='ACTIVE' && sub.plan && sub.plan.buyerPremium===true;})()" "subscription ACTIVE and buyer premium only"
CHARGED="$(json_value "obj.chargedPaisa")"
[ "$CHARGED" = "$PRO_PRICE" ] && pass "subscription charged expected wallet amount: $CHARGED" || fail "subscription charged $CHARGED expected $PRO_PRICE"

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable after subscription purchase"
json_assert "(()=>{const ledger=obj.ledger||[]; return ledger.some(x=>x.referenceType==='SUBSCRIPTION_PURCHASE' && x.referenceId==='$PRO_PLAN_ID' && BigInt(x.amountPaisa||0n)===BigInt('$PRO_PRICE'));})()" "wallet ledger contains SUBSCRIPTION_PURCHASE debit"

http POST "/listings/$LISTING_PRO/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "Pro buyer places reduced deposit"
PRO_DEPOSIT="$(json_value "obj.requiredDepositPaisa || obj.deposit?.amountPaisa")"
if [ "$PRO_DEPOSIT" = "150000" ]; then pass "Pro plan deposit is 3% of 5,000,000 = 150000"; else fail "Pro deposit expected 150000 got ${PRO_DEPOSIT:-missing}"; fi

# Force subscription expiry in DB, then call /my so the API performs lazy expiry.
if docker compose -f "$COMPOSE_FILE" exec -T \
  -e BUYER_EMAIL="$BUYER_EMAIL" \
  backend node <<'NODE' >/tmp/uc12_expire.out 2>/tmp/uc12_expire.err
const prisma = require('./src/services/prisma');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  if (!user) throw new Error('buyer not found');
  const sub = await prisma.userSubscription.update({
    where: { userId: user.id },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  console.log(JSON.stringify({ subscriptionId: sub.id, expiresAt: sub.expiresAt }));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "buyer subscription artificially expired for UC-SUB-02 smoke"
else
  fail "failed to force subscription expiry"
  cat /tmp/uc12_expire.err 2>/dev/null || true
fi

http GET /subscriptions/my "$BUYER_TOKEN"
expect 200 "UC-SUB-02 buyer subscription endpoint handles expiry"
json_assert "obj && obj.status === 'EXPIRED'" "expired subscription status stored"

create_listing "UC12 Expired Tier Deposit $TS" "$SELLER_TOKEN"
expect 201 "seller creates third listing after buyer subscription expiry"
LISTING_EXPIRED="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
[ -n "$LISTING_EXPIRED" ] && pass "expired-tier listing id: $LISTING_EXPIRED" || fail "expired-tier listing id missing"

http POST "/listings/$LISTING_EXPIRED/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "expired buyer reverts to Basic deposit tier"
EXPIRED_DEPOSIT="$(json_value "obj.requiredDepositPaisa || obj.deposit?.amountPaisa")"
if [ "$EXPIRED_DEPOSIT" = "250000" ]; then pass "expired tier deposit reverted to default 5% = 250000"; else fail "expired deposit expected 250000 got ${EXPIRED_DEPOSIT:-missing}"; fi

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable after expiry deposits"
json_assert "(()=>{const deps=obj.deposits||[]; const pro=deps.find(d=>d.listingId==='$LISTING_PRO'); return pro && String(pro.amountPaisa)==='150000';})()" "existing held Pro deposit remained 150000 after expiry"

http GET /wallet "$SELLER_TOKEN"
expect 200 "seller wallet readable for seller-free subscription check"
json_assert "(()=>{const ledger=obj.ledger||[]; return !ledger.some(x => x.referenceType==='SUBSCRIPTION_PURCHASE' || x.referenceType==='COMMISSION_CAPTURE' || x.type==='ESCROW_CAPTURE' || x.type==='DEBIT');})()" "seller wallet has no subscription purchase or platform debit rows"

printf '----------------------------------------------------------------\n'
printf 'UC-12 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
