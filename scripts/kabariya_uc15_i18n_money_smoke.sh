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

pass(){ PASS=$((PASS+1)); printf '✅ PASS  %s\n' "$1"; }
fail(){ FAIL=$((FAIL+1)); printf '❌ FAIL  %s\n' "$1"; if [ -s "$TMP_BODY" ]; then printf '%s\n' '---- body ----'; head -c 1600 "$TMP_BODY"; printf '\n'; fi; }
warn(){ WARN=$((WARN+1)); printf '⚠️  WARN  %s\n' "$1"; }

request(){
  local method="$1" path="$2" token="${3:-}" data="${4:-}" out="${5:-$TMP_BODY}"
  local args=(-sS -o "$out" -w "%{http_code}" -X "$method" "$API_BASE$path")
  if [ -n "$token" ]; then args+=( -H "Authorization: Bearer $token" ); fi
  if [ -n "$data" ]; then args+=( -H "Content-Type: application/json" -d "$data" ); fi
  curl "${args[@]}" || echo "000"
}

assert_code(){
  local code="$1" expected="$2" label="$3"
  if [ "$code" = "$expected" ]; then pass "$label [$expected]"; else fail "$label expected $expected got $code"; fi
}

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

extract_token(){
  node - "$TMP_BODY" <<'NODE'
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(obj.accessToken || obj.token || obj?.data?.accessToken || obj?.data?.token || '');
NODE
}

printf 'Kabariya UC-15 localization/currency smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
printf '%s\n' '----------------------------------------------------------------'

if docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  pass 'docker compose project reachable'
else
  warn 'docker compose not reachable from this shell; API checks will still run'
fi

code=$(request GET /languages)
assert_code "$code" 200 'UC-I18N-01 public languages endpoint'
json_assert 'languages include English and Urdu with Urdu RTL direction' "Array.isArray(obj) && obj.some(l => l.id === 'en') && obj.some(l => l.id === 'ur' && String(l.direction).toUpperCase() === 'RTL')"

code=$(request GET /currencies)
assert_code "$code" 200 'UC-I18N-02 public currencies endpoint'
json_assert 'PKR currency is available with rupee symbol metadata' "Array.isArray(obj) && obj.some(c => c.id === 'PKR' && String(c.symbol || c.symbolNative).includes('₨'))"

code=$(request GET '/currencies/PKR/format?amountPaisa=150000&lang=en')
assert_code "$code" 200 'currency formatter accepts integer paisa in English'
json_assert '150000 paisa formats as PKR 1,500 without floating point drift' "obj.amountPaisa === '150000' && obj.integerPaisa === true && /1,500/.test(obj.amountFormatted)"

code=$(request GET '/currencies/PKR/format?amountPaisa=150000&lang=ur')
assert_code "$code" 200 'currency formatter accepts integer paisa in Urdu'
json_assert 'Urdu formatted money uses Urdu numerals' "/۱/.test(obj.amountFormatted) || /۵/.test(obj.amountFormatted) || /۰/.test(obj.amountFormatted)"

code=$(request GET '/currencies/PKR/format?amountPaisa=1500.25&lang=en')
if [ "$code" = "400" ]; then pass 'currency formatter rejects non-integer money values'; else fail "currency formatter should reject non-integer money values, got $code"; fi

code=$(request GET /translations/en/common)
assert_code "$code" 200 'English common translations endpoint'

TS="$(date +%s%N)"
ADMIN_BODY='{"email":"admin@marketplace.pk","password":"Admin@123456"}'
code=$(request POST /auth/admin/login '' "$ADMIN_BODY")
assert_code "$code" 200 'admin portal login for translation admin smoke'
ADMIN_TOKEN="$(extract_token)"
if [ -n "$ADMIN_TOKEN" ]; then pass 'admin token present'; else fail 'admin token missing'; fi

if [ -n "$ADMIN_TOKEN" ]; then
  FALLBACK_KEY="uc15_fallback_${TS}"
  EN_PAYLOAD="{\"languageId\":\"en\",\"namespace\":\"uc15\",\"key\":\"${FALLBACK_KEY}\",\"value\":\"UC15 English fallback ${TS}\"}"
  code=$(request POST /translations "$ADMIN_TOKEN" "$EN_PAYLOAD")
  assert_code "$code" 200 'admin creates English fallback translation'

  UR_KEY="uc15_urdu_${TS}"
  UR_PAYLOAD="{\"languageId\":\"ur\",\"namespace\":\"uc15\",\"key\":\"${UR_KEY}\",\"value\":\"اردو ٹیسٹ ${TS}\",\"isRTL\":true}"
  code=$(request POST /translations "$ADMIN_TOKEN" "$UR_PAYLOAD")
  assert_code "$code" 200 'admin creates Urdu translation'

  code=$(request GET /translations/ur/uc15 '' '' "$TMP_BODY2")
  cp "$TMP_BODY2" "$TMP_BODY"
  assert_code "$code" 200 'Urdu namespace translations endpoint with fallback'
  json_assert 'Urdu namespace includes English fallback key missing in Urdu' "obj['${FALLBACK_KEY}'] === 'UC15 English fallback ${TS}'"
  json_assert 'Urdu namespace prefers Urdu value when present' "obj['${UR_KEY}'] && obj['${UR_KEY}'].includes('اردو')"
fi

# Verify wallet amountFormatted now follows integer-paisa formatting for API consumers.
BUYER_EMAIL="uc15-buyer-${TS}@example.test"
BUYER_BODY="{\"email\":\"${BUYER_EMAIL}\",\"password\":\"Buyer@12345\",\"phone\":\"+92315${TS:0:7}\",\"firstName\":\"UC15\",\"lastName\":\"Buyer\",\"role\":\"CUSTOMER\"}"
code=$(request POST /auth/register '' "$BUYER_BODY")
assert_code "$code" 201 'register UC15 buyer'
BUYER_TOKEN="$(extract_token)"
if [ -n "$BUYER_TOKEN" ]; then pass 'buyer token present'; else fail 'buyer token missing'; fi

if [ -n "$BUYER_TOKEN" ]; then
  if docker compose -f "$COMPOSE_FILE" exec -T -e BUYER_EMAIL="$BUYER_EMAIL" backend node <<'NODE'
const prisma = require('./src/services/prisma');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL }, include: { wallet: true } });
  if (!user?.wallet) throw new Error('wallet missing');
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({ where: { id: user.wallet.id }, data: { availableBalancePaisa: 150000n } });
    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amountPaisa: 150000n,
        balanceAfterPaisa: 150000n,
        availableAfterPaisa: 150000n,
        escrowedAfterPaisa: 0n,
        referenceType: 'MANUAL_ADJUSTMENT',
        note: 'UC15 integer-paisa formatting smoke credit',
      },
    });
  });
})().finally(() => prisma.$disconnect());
NODE
  then
    pass 'buyer wallet credited to 150000 paisa for formatting check'
    code=$(request GET /wallet "$BUYER_TOKEN")
    assert_code "$code" 200 'buyer wallet readable for amountFormatted check'
    json_assert 'wallet amountFormatted treats 150000 paisa as PKR 1,500' "obj.wallet && obj.wallet.availableBalancePaisa === '150000' && /1,500/.test(obj.wallet.amountFormatted)"
  else
    warn 'could not seed wallet formatting check through docker compose'
  fi
fi

printf '%s\n' '----------------------------------------------------------------'
printf 'UC-15 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
