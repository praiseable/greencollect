#!/usr/bin/env bash
set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${BASE_URL%/}/api"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PASS=0
FAIL=0
WARN=0
TMP_BODY="/tmp/kabariya_uc15_body.json"
TMP_BODY2="/tmp/kabariya_uc15_body2.json"

pass(){ PASS=$((PASS+1)); printf 'PASS  %s\n' "$1"; }
fail(){ FAIL=$((FAIL+1)); printf 'FAIL  %s\n' "$1"; if [ -s "$TMP_BODY" ]; then printf '%s\n' '---- body ----'; head -c 1600 "$TMP_BODY"; printf '\n'; fi; }
warn(){ WARN=$((WARN+1)); printf 'WARN  %s\n' "$1"; }

request(){
 local method="$1" path="$2" token="${3:-}" data="${4:-}" out="${5:-$TMP_BODY}"
 local args=(-sS -o "$out" -w "%{http_code}" -X "$method" "$API_BASE$path")
 if [ -n "$token" ]; then args+=( -H "Authorization: Bearer $token" ); fi
 if [ -n "$data" ]; then args+=( -H "Content-Type: application/json" -d "$data" ); fi
 curl "${args[@]}" || echo "000"
}

assert_code(){ local code="$1" expected="$2" label="$3"; if [ "$code" = "$expected" ]; then pass "$label [$expected]"; else fail "$label expected $expected got $code"; fi; }
json_assert(){
 local label="$1" script="$2" file="${3:-$TMP_BODY}"
 node - "$file" "$script" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const script = process.argv[3];
const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Function('obj', `return (${script});`)(obj)) process.exit(1);
NODE
 if [ "$?" = "0" ]; then pass "$label"; else fail "$label"; fi
}
extract_token(){ node - "$TMP_BODY" <<'NODE'
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(obj.accessToken || obj.token || obj?.data?.accessToken || obj?.data?.token || '');
NODE
}

printf 'Kabariya UC-15 localization/currency smoke â€” strict rupees mode\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
printf '%s\n' '----------------------------------------------------------------'

if docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then pass 'docker compose project reachable'; else warn 'docker compose not reachable; API checks still run'; fi

code=$(request GET /languages)
assert_code "$code" 200 'UC-I18N-01 public languages endpoint'
json_assert 'languages include English and Urdu with Urdu RTL direction' "Array.isArray(obj) && obj.some(l => l.id === 'en') && obj.some(l => l.id === 'ur' && String(l.direction).toUpperCase() === 'RTL')"

code=$(request GET /currencies)
assert_code "$code" 200 'UC-I18N-02 public currencies endpoint'
json_assert 'PKR currency is available with rupee symbol metadata' "Array.isArray(obj) && obj.some(c => c.id === 'PKR' && String(c.symbol || c.symbolNative).includes('â‚¨'))"

code=$(request GET '/currencies/PKR/format?amountRupees=1500&lang=en')
assert_code "$code" 200 'currency formatter accepts integer rupees in English'
json_assert '1500 rupees formats as PKR 1,500 without floating point drift' "obj.amountRupees === '1500' && obj.integerRupees === true && obj.moneyBaseUnit === 'rupees' && /1,500/.test(obj.amountFormatted)"

code=$(request GET '/currencies/PKR/format?amountRupees=1500&lang=ur')
assert_code "$code" 200 'currency formatter accepts integer rupees in Urdu'
json_assert 'Urdu formatted money uses Urdu numerals' "obj.moneyBaseUnit === 'rupees' && (/Û±/.test(obj.amountFormatted) || /Ûµ/.test(obj.amountFormatted) || /Û°/.test(obj.amountFormatted))"

code=$(request GET '/currencies/PKR/format?amountRupees=1500.25&lang=en')
if [ "$code" = "400" ]; then pass 'currency formatter rejects non-integer rupee values'; else fail "currency formatter should reject non-integer rupee values, got $code"; fi

code=$(request GET '/currencies/PKR/format?amountPaisa=150000&lang=en')
if [ "$code" = "400" ]; then pass 'legacy amountPaisa query is rejected in strict rupees mode'; else fail "legacy amountPaisa query should be rejected, got $code"; fi

code=$(request GET /translations/en/common)
assert_code "$code" 200 'English common translations endpoint'

TS="$(date +%s%N)"
ADMIN_BODY='{"email":"admin@marketplace.pk","password":"Admin@123456"}'
code=$(request POST /auth/admin/login '' "$ADMIN_BODY")
assert_code "$code" 200 'admin portal login for translation admin smoke'
ADMIN_TOKEN="$(extract_token)"
[ -n "$ADMIN_TOKEN" ] && pass 'admin token present' || fail 'admin token missing'

if [ -n "$ADMIN_TOKEN" ]; then
 FALLBACK_KEY="uc15_fallback_${TS}"
 EN_PAYLOAD="{\"languageId\":\"en\",\"namespace\":\"uc15\",\"key\":\"${FALLBACK_KEY}\",\"value\":\"UC15 English fallback ${TS}\"}"
 code=$(request POST /translations "$ADMIN_TOKEN" "$EN_PAYLOAD")
 assert_code "$code" 200 'admin creates English fallback translation'

 UR_KEY="uc15_urdu_${TS}"
 UR_PAYLOAD="{\"languageId\":\"ur\",\"namespace\":\"uc15\",\"key\":\"${UR_KEY}\",\"value\":\"Ø§Ø±Ø¯Ùˆ Ù¹ÛŒØ³Ù¹ ${TS}\",\"isRTL\":true}"
 code=$(request POST /translations "$ADMIN_TOKEN" "$UR_PAYLOAD")
 assert_code "$code" 200 'admin creates Urdu translation'

 code=$(request GET /translations/ur/uc15 '' '' "$TMP_BODY2")
 cp "$TMP_BODY2" "$TMP_BODY"
 assert_code "$code" 200 'Urdu namespace translations endpoint with fallback'
 json_assert 'Urdu namespace includes English fallback key missing in Urdu' "obj['${FALLBACK_KEY}'] === 'UC15 English fallback ${TS}'"
 json_assert 'Urdu namespace prefers Urdu value when present' "obj['${UR_KEY}'] && obj['${UR_KEY}'].includes('Ø§Ø±Ø¯Ùˆ')"
fi

BUYER_EMAIL="uc15-buyer-${TS}@example.test"
BUYER_PHONE="+92315${TS: -7}"
BUYER_BODY="{\"email\":\"${BUYER_EMAIL}\",\"password\":\"Buyer@12345\",\"phone\":\"${BUYER_PHONE}\",\"firstName\":\"UC15\",\"lastName\":\"Buyer\",\"role\":\"CUSTOMER\"}"
code=$(request POST /auth/register '' "$BUYER_BODY")
assert_code "$code" 201 'register UC15 buyer'
BUYER_TOKEN="$(extract_token)"
[ -n "$BUYER_TOKEN" ] && pass 'buyer token present' || fail 'buyer token missing'

if [ -n "$BUYER_TOKEN" ]; then
 if docker compose -f "$COMPOSE_FILE" exec -T -e BUYER_EMAIL="$BUYER_EMAIL" backend node <<'NODE'
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async () => {
 const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
 if (!user) throw new Error('user missing');
 await creditWallet(user.id, 1500n, 'MANUAL_ADJUSTMENT', `uc15-rupees-${Date.now()}`, 'UC15 integer-rupees formatting smoke credit', { source: 'uc15', moneyBaseUnit: 'rupees' });
})().finally(() => prisma.$disconnect());
NODE
 then
   pass 'buyer wallet credited to 1500 rupees for formatting check'
   code=$(request GET /wallet "$BUYER_TOKEN")
   assert_code "$code" 200 'buyer wallet readable for amountFormatted check'
   json_assert 'wallet amountFormatted treats 1500 rupees as PKR 1,500' "obj.wallet && String(obj.wallet.availableBalanceRupees || obj.wallet.availableBalancePaisa) === '1500' && /1,500/.test(obj.wallet.amountFormatted)"
 else
   warn 'could not seed wallet formatting check through docker compose'
 fi
fi

printf '%s\n' '----------------------------------------------------------------'
printf 'UC-15 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]