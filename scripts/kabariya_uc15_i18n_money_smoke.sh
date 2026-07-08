#!/usr/bin/env bash
set -uo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${BASE_URL%/}/api"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PASS=0; FAIL=0; WARN=0
TMP_BODY="/tmp/kabariya_uc15_body.json"
pass(){ PASS=$((PASS+1)); printf 'PASS  %s\n' "$1"; }
fail(){ FAIL=$((FAIL+1)); printf 'FAIL  %s\n' "$1"; [ -s "$TMP_BODY" ] && { printf '%s\n' '---- body ----'; head -c 1600 "$TMP_BODY"; printf '\n'; }; }
request(){ local method="$1" path="$2" token="${3:-}" data="${4:-}"; local args=(-sS -o "$TMP_BODY" -w "%{http_code}" -X "$method" "$API_BASE$path"); [ -n "$token" ] && args+=(-H "Authorization: Bearer $token"); [ -n "$data" ] && args+=(-H "Content-Type: application/json" -d "$data"); curl "${args[@]}" || echo 000; }
assert_code(){ local code="$1" expected="$2" label="$3"; [ "$code" = "$expected" ] && pass "$label [$expected]" || fail "$label expected $expected got $code"; }
json_assert(){ local label="$1" script="$2"; node - "$TMP_BODY" "$script" <<'NODE'
const fs = require('fs'); const file = process.argv[2]; const script = process.argv[3]; const obj = JSON.parse(fs.readFileSync(file,'utf8')); if (!Function('obj', `return (${script});`)(obj)) process.exit(1);
NODE
[ "$?" = 0 ] && pass "$label" || fail "$label"; }
extract_token(){ node - "$TMP_BODY" <<'NODE'
const fs=require('fs');const obj=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));console.log(obj.accessToken||obj.token||obj?.data?.accessToken||obj?.data?.token||'');
NODE
}
printf 'Kabariya UC-15 localization/currency smoke — strict rupees mode\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
printf '%s\n' '----------------------------------------------------------------'
docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1 && pass 'docker compose project reachable'
code=$(request GET /languages); assert_code "$code" 200 'UC-I18N-01 public languages endpoint'; json_assert 'languages include English and Urdu with Urdu RTL direction' "Array.isArray(obj) && obj.some(l=>l.id==='en') && obj.some(l=>l.id==='ur' && String(l.direction).toUpperCase()==='RTL')"
code=$(request GET /currencies); assert_code "$code" 200 'UC-I18N-02 public currencies endpoint'; json_assert 'PKR currency is available with rupee symbol metadata' "Array.isArray(obj) && obj.some(c=>c.id==='PKR' && String(c.symbol || c.symbolNative).includes('₨'))"
code=$(request GET '/currencies/PKR/format?amountRupees=1500&lang=en'); assert_code "$code" 200 'currency formatter accepts integer rupees in English'; json_assert '1500 rupees formats as PKR 1,500' "String(obj.amountRupees)==='1500' && /1,500/.test(obj.amountFormatted) && obj.moneyBaseUnit==='rupees'"
code=$(request GET '/currencies/PKR/format?amountRupees=1500&lang=ur'); assert_code "$code" 200 'currency formatter accepts integer rupees in Urdu'; json_assert 'Urdu formatted money uses Urdu numerals' "obj.moneyBaseUnit==='rupees' && (/۱|۵|۰/.test(obj.amountFormatted))"
code=$(request GET '/currencies/PKR/format?amountRupees=1500.25&lang=en'); [ "$code" = 400 ] && pass 'currency formatter rejects non-integer rupee values' || fail "currency formatter should reject non-integer rupee values, got $code"
code=$(request GET '/currencies/PKR/format?amountPaisa=150000&lang=en'); [ "$code" = 400 ] && pass 'legacy amountPaisa query is rejected in strict rupees mode' || fail "legacy amountPaisa query should be rejected, got $code"
code=$(request GET /translations/en/common); assert_code "$code" 200 'English common translations endpoint'
TS="$(date +%s%N)"; ADMIN_BODY='{"email":"admin@marketplace.pk","password":"Admin@123456"}'
code=$(request POST /auth/admin/login '' "$ADMIN_BODY"); assert_code "$code" 200 'admin portal login for translation admin smoke'; ADMIN_TOKEN="$(extract_token)"; [ -n "$ADMIN_TOKEN" ] && pass 'admin token present' || fail 'admin token missing'
code=$(request POST /translations "$ADMIN_TOKEN" "{\"namespace\":\"uc15\",\"key\":\"fallback_$TS\",\"languageId\":\"en\",\"value\":\"English fallback $TS\"}"); assert_code "$code" 200 'admin creates English fallback translation'
code=$(request POST /translations "$ADMIN_TOKEN" "{\"namespace\":\"uc15\",\"key\":\"override_$TS\",\"languageId\":\"en\",\"value\":\"English override $TS\"}"); assert_code "$code" 200 'admin creates English override base'
code=$(request POST /translations "$ADMIN_TOKEN" "{\"namespace\":\"uc15\",\"key\":\"override_$TS\",\"languageId\":\"ur\",\"value\":\"اردو $TS\"}"); assert_code "$code" 200 'admin creates Urdu translation'
code=$(request GET "/translations/ur/uc15"); assert_code "$code" 200 'Urdu namespace translations endpoint with fallback'; json_assert 'Urdu namespace includes English fallback key missing in Urdu' "JSON.stringify(obj).includes('fallback_$TS')"; json_assert 'Urdu namespace prefers Urdu value when present' "JSON.stringify(obj).includes('اردو $TS')"
BUYER_PHONE="+92377${TS: -7}"; code=$(request POST /auth/register '' "{\"firstName\":\"UC15\",\"lastName\":\"Buyer\",\"phone\":\"$BUYER_PHONE\",\"email\":\"uc15.$TS@example.com\",\"password\":\"Test@123456\"}"); assert_code "$code" 201 'register UC15 buyer'; BUYER_TOKEN="$(extract_token)"; [ -n "$BUYER_TOKEN" ] && pass 'buyer token present' || fail 'buyer token missing'
if docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then docker compose -f "$COMPOSE_FILE" exec -T backend node - <<NODE
const prisma=require('./src/services/prisma'); const { creditWallet }=require('./src/services/wallet.service');
(async()=>{const u=await prisma.user.findUnique({where:{phone:'$BUYER_PHONE'}}); await creditWallet(u.id,1500n,'MANUAL_ADJUSTMENT','uc15-rupees-$TS','UC15 rupees formatting smoke credit',{source:'uc15',moneyBaseUnit:'rupees'}); await prisma.\$disconnect();})().catch(async e=>{console.error(e); await prisma.\$disconnect(); process.exit(1);});
NODE
pass 'buyer wallet credited to 1500 rupees for formatting check'; fi
code=$(request GET /wallet "$BUYER_TOKEN"); assert_code "$code" 200 'buyer wallet readable for amountFormatted check'; json_assert 'wallet amountFormatted treats 1500 rupees as PKR 1,500' "JSON.stringify(obj).includes('1,500') && obj.moneyBaseUnit==='rupees'"
printf '%s\n' '----------------------------------------------------------------'; printf 'UC-15 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"; [ "$FAIL" -eq 0 ]
