#!/usr/bin/env bash
# Kabariya v3 UC-17 / UC-ADM-08 anti-disintermediation smoke test.
# Runs on the Linux server from ~/gc-app. Creates a buyer who unlocks and releases
# multiple listings, runs the admin scan, verifies a review flag is created, and
# verifies no automatic penalty/suspension/debit happens.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PRICE_PAISA="${PRICE_PAISA:-1000000}"
TOPUP_PAISA="${TOPUP_PAISA:-2000000}"
UNLOCK_COUNT="${UNLOCK_COUNT:-4}"
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

printf 'Kabariya UC-17 anti-disintermediation smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s UNLOCK_COUNT=%s\n' "$API_BASE" "$COMPOSE_FILE" "$UNLOCK_COUNT"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  line; printf 'UC-17 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

http POST /auth/admin/login "" '{"email":"admin@marketplace.pk","password":"Admin@123456"}'
expect 200 "Admin portal login"
ADMIN_TOKEN="$(extract_token)"
[ -n "$ADMIN_TOKEN" ] && pass "admin token present" || fail "admin token missing"

http GET /categories
expect 200 "GET /api/categories"
CATEGORY_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.categories||obj)[0]?.id")"
[ -n "$CATEGORY_ID" ] && pass "category id selected: $CATEGORY_ID" || fail "no category id found"

http GET /units
expect 200 "GET /api/units"
UNIT_ID="$(json_value "(Array.isArray(obj.data)?obj.data:obj.data?.items||obj.units||obj)[0]?.id")"
[ -n "$UNIT_ID" ] && pass "unit id selected: $UNIT_ID" || fail "no unit id found"

TS="$(date +%s%N | cut -c1-13)"
PASSWORD="Smoke@123456"
SELLER_EMAIL="uc17.seller.$TS@example.test"
BUYER_EMAIL="uc17.buyer.$TS@example.test"
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

http POST /auth/register "" "{\"firstName\":\"UC17\",\"lastName\":\"Seller\",\"email\":\"$SELLER_EMAIL\",\"phone\":\"$SELLER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register UC17 seller"
SELLER_TOKEN="$(extract_token)"
SELLER_ID="$(json_value "obj.user?.id || obj.data?.user?.id || obj.id")"
[ -n "$SELLER_TOKEN" ] && pass "seller token present" || fail "seller token missing"

http POST /auth/register "" "{\"firstName\":\"UC17\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register UC17 buyer"
BUYER_TOKEN="$(extract_token)"
BUYER_ID="$(json_value "obj.user?.id || obj.data?.user?.id || obj.id")"
[ -n "$BUYER_TOKEN" ] && pass "buyer token present" || fail "buyer token missing"
[ -n "$BUYER_ID" ] && pass "buyer id present: $BUYER_ID" || fail "buyer id missing"

# Top up once through the ledger service, not direct DB mutation.
if docker compose -f "$COMPOSE_FILE" exec -T \
  -e BUYER_EMAIL="$BUYER_EMAIL" \
  -e TOPUP_PAISA="$TOPUP_PAISA" \
  backend node <<'NODE' >/tmp/uc17_topup.out 2>/tmp/uc17_topup.err
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  if (!user) throw new Error('buyer not found');
  const wallet = await creditWallet(user.id, BigInt(process.env.TOPUP_PAISA), {
    referenceType: 'TOPUP',
    referenceId: `uc17-smoke-${Date.now()}`,
    note: 'UC17 smoke ledger top-up',
  });
  console.log(JSON.stringify({ userId: user.id, availableBalancePaisa: wallet.availableBalancePaisa.toString() }));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "buyer wallet credited for UC17 unlock/release pattern"
else
  fail "buyer wallet top-up failed"
  cat /tmp/uc17_topup.err 2>/dev/null || true
fi

# Create multiple listing unlocks that are then voluntarily released. Released deposits are eligible
# for the rolling-window scan; held, non-expired deposits must be excluded by the scanner.
CREATED_LISTINGS=0
RELEASED_DEPOSITS=0
for i in $(seq 1 "$UNLOCK_COUNT"); do
  LISTING_BODY="{\"title\":\"UC17 Flag Listing $TS-$i\",\"description\":\"UC17 anti-disintermediation smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC17 exact pickup address $i\",\"contactNumber\":\"$SELLER_PHONE\"}"
  http POST /listings "$SELLER_TOKEN" "$LISTING_BODY"
  if [ "$STATUS" = "201" ]; then
    CREATED_LISTINGS=$((CREATED_LISTINGS+1))
    LISTING_ID="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
    pass "seller creates UC17 listing $i: $LISTING_ID"
  else
    fail "seller creates UC17 listing $i expected 201 got $STATUS"
    continue
  fi

  http POST "/listings/$LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
    DEPOSIT_ID="$(json_value "obj.deposit?.id || obj.data?.deposit?.id")"
    pass "buyer unlocks listing $i with deposit: $DEPOSIT_ID"
  else
    fail "buyer deposit on listing $i expected 200/201 got $STATUS"
    continue
  fi

  http POST "/wallet/deposits/$DEPOSIT_ID/release" "$BUYER_TOKEN" "{}"
  if [ "$STATUS" = "200" ]; then
    RELEASED_DEPOSITS=$((RELEASED_DEPOSITS+1))
    pass "buyer releases deposit $i before deal"
  else
    fail "buyer release deposit $i expected 200 got $STATUS"
  fi
done

[ "$CREATED_LISTINGS" -ge 3 ] && pass "created enough listings for rolling-window scan ($CREATED_LISTINGS)" || fail "not enough listings created for scan ($CREATED_LISTINGS)"
[ "$RELEASED_DEPOSITS" -ge 3 ] && pass "released enough deposits for no-deal ratio ($RELEASED_DEPOSITS)" || fail "not enough released deposits for scan ($RELEASED_DEPOSITS)"

# Manual admin trigger for the automated scan.
http POST /admin/flagged-users/scan "$ADMIN_TOKEN" "{}"
expect 200 "UC-ADM-08 admin triggers anti-disintermediation scan"
CREATED_FLAGS="$(json_value "obj.created ?? obj.data?.created ?? 0")"
case "$CREATED_FLAGS" in '' ) CREATED_FLAGS=0 ;; esac
[ "$CREATED_FLAGS" -ge 1 ] && pass "scan created at least one flag ($CREATED_FLAGS)" || warn "scan returned created=$CREATED_FLAGS; checking queue for existing open flag"

http GET "/admin/flagged-users?status=open&limit=100" "$ADMIN_TOKEN"
expect 200 "admin lists open anti-disintermediation flags"
FLAG_ID="$(node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$BODY','utf8')); const rows=obj.data||obj.flags||[]; const flag=rows.find(f=>f.userId==='$BUYER_ID' && f.reason==='SUSPECTED_PLATFORM_DISINTERMEDIATION'); if(flag) console.log(flag.id);" 2>/dev/null || true)"
[ -n "$FLAG_ID" ] && pass "review queue contains SUSPECTED_PLATFORM_DISINTERMEDIATION flag for buyer" || fail "review queue missing UC17 buyer flag"

json_assert "(()=>{const rows=obj.data||obj.flags||[]; const f=rows.find(x=>x.userId==='$BUYER_ID' && x.reason==='SUSPECTED_PLATFORM_DISINTERMEDIATION'); if(!f) return false; const m=f.metrics||{}; return Number(m.unlockCount||0) >= 3 && Number(m.cancelCount||0) >= 3 && Number(m.ratio||0) > 0.35;})()" "flag metrics include unlockCount, cancelCount, ratio above threshold"

# UC-ADM-08 acceptance: flagging creates a review signal only; it must not auto-suspend,
# auto-penalize, forfeit deposits, or debit the buyer wallet.
http GET /auth/me "$BUYER_TOKEN"
expect 200 "flagged buyer remains able to authenticate; no auto-suspension"
json_assert "(()=>{const u=obj.user||obj.data?.user||obj; return u.isActive !== false && !['SUSPENDED','suspended'].includes(String(u.accountStatus||''));})()" "flagging did not change buyer active/account status"

http GET /wallet "$BUYER_TOKEN"
expect 200 "buyer wallet readable after flagging"
json_assert "(()=>{const ledger=obj.ledger||obj.data?.ledger||[]; return !ledger.some(l => ['FORFEITURE','COMMISSION_CAPTURE'].includes(l.referenceType) || /disintermediation|penalty|forfeit/i.test(String(l.note||'')));})()" "flagging did not create automatic penalty/forfeiture ledger rows"
json_assert "(()=>{const deposits=obj.deposits||obj.data?.deposits||[]; return deposits.filter(d => String(d.status).toUpperCase()==='FORFEITED').length === 0;})()" "flagging did not forfeit any buyer deposits"

if [ -n "$FLAG_ID" ]; then
  http PATCH "/admin/flagged-users/$FLAG_ID" "$ADMIN_TOKEN" '{"status":"dismissed"}'
  expect 200 "admin can dismiss anti-disintermediation flag without penalty"
  json_assert "(obj.status || obj.data?.status) === 'dismissed'" "flag status stored as dismissed"
fi

line
printf 'UC-17 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
