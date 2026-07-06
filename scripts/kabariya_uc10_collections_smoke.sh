#!/usr/bin/env bash
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${BASE_URL%/}/api"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@marketplace.pk}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123456}"

PASS=0
FAIL=0
WARN=0
TMP_DIR="${TMPDIR:-/tmp}/kabariya_uc10_$$"
mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT

pass(){ PASS=$((PASS+1)); echo "✅ PASS  $1"; }
fail(){ FAIL=$((FAIL+1)); echo "❌ FAIL  $1"; if [ -f "$TMP_DIR/body.json" ]; then printf '%s\n' "---- body ----"; head -c 1800 "$TMP_DIR/body.json"; printf '\n'; fi; }
warn(){ WARN=$((WARN+1)); echo "⚠️  WARN  $1"; }

request(){
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local args=(-sS -o "$TMP_DIR/body.json" -w "%{http_code}" -X "$method" "$API_BASE$path")
  if [ -n "$token" ]; then args+=(-H "Authorization: Bearer $token"); fi
  if [ -n "$body" ]; then args+=(-H "Content-Type: application/json" -d "$body"); fi
  curl "${args[@]}" || echo "000"
}

expect_code(){
  local name="$1" method="$2" path="$3" token="$4" body="$5" expected="$6"
  local code
  code=$(request "$method" "$path" "$token" "$body")
  if [ "$code" = "$expected" ]; then
    pass "$name [$expected]"
  else
    fail "$name expected $expected got $code"
  fi
  echo "$code" > "$TMP_DIR/last_code"
}

extract(){
  local js="$1"
  node -e '
const fs = require("fs");
let obj = {};
try { obj = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (_) {}
const fn = new Function("obj", process.argv[2]);
const value = fn(obj);
if (value !== undefined && value !== null) process.stdout.write(String(value));
' "$TMP_DIR/body.json" "$js"
}

body_has_contact_leak(){
  node - "$TMP_DIR/body.json" <<'NODE'
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const text = JSON.stringify(obj).toLowerCase();
const suspicious = ['contactnumber','sellerphone','exactaddress','phone_number','seller_phone'];
// Only count as leak when keys have non-null/non-empty values. String scanning alone creates false positives.
function values(o, out = []) {
  if (!o || typeof o !== 'object') return out;
  for (const [k,v] of Object.entries(o)) {
    const lk = k.toLowerCase();
    if (suspicious.includes(lk) || lk.includes('phone') || lk.includes('exactaddress')) out.push([k,v]);
    if (v && typeof v === 'object') values(v, out);
  }
  return out;
}
const leaked = values(obj).filter(([_,v]) => v !== null && v !== undefined && v !== '' && v !== false);
if (leaked.length) {
  console.error(JSON.stringify(leaked));
  process.exit(1);
}
NODE
}

echo "Kabariya UC-10 collections/logistics smoke"
echo "API_BASE=$API_BASE COMPOSE_FILE=$COMPOSE_FILE"
echo "----------------------------------------------------------------"

if docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  pass "docker compose project reachable"
else
  warn "docker compose project not reachable from current directory; API-only checks continue"
fi

# Security baseline: collections are not listed in the public endpoint exemptions.
code=$(request GET "/collections" "" "")
if [ "$code" = "401" ] || [ "$code" = "403" ]; then
  pass "UC-COLL security: anonymous GET /collections rejected [$code]"
else
  fail "UC-COLL security: anonymous GET /collections must be 401/403, got $code"
fi

code=$(request POST "/collections" "" '{"listingId":"00000000-0000-0000-0000-000000000000","dealerId":"00000000-0000-0000-0000-000000000000","collectionDate":"2026-07-06T12:00:00.000Z"}')
if [ "$code" = "401" ] || [ "$code" = "403" ]; then
  pass "UC-COLL security: anonymous POST /collections rejected [$code]"
else
  fail "UC-COLL security: anonymous POST /collections must be 401/403 before validation/creation, got $code"
fi

# Admin login
expect_code "Admin portal login" POST "/auth/admin/login" "" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 200
ADMIN_TOKEN=$(extract 'return obj.accessToken || obj.token || obj?.data?.accessToken || obj?.data?.token || "";')
if [ -n "$ADMIN_TOKEN" ]; then pass "admin token present"; else fail "admin token missing"; fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "----------------------------------------------------------------"
  echo "UC-10 summary: PASSED=$PASS FAILED=$FAIL WARNINGS=$WARN"
  exit 1
fi

# Select listing and dealer
expect_code "Admin list users for dealer selection" GET "/users?role=DEALER&limit=20" "$ADMIN_TOKEN" "" 200
DEALER_ID=$(extract 'const rows = obj.data || obj.users || []; const u = rows.find(x => x.email === "dealer@marketplace.pk") || rows[0]; return u && u.id;')
if [ -n "$DEALER_ID" ]; then pass "dealer selected: $DEALER_ID"; else fail "no DEALER user found"; fi

expect_code "Public listings for collection target" GET "/listings?limit=10" "" "" 200
LISTING_ID=$(extract 'let rows = obj.data || obj.listings || obj; if (!Array.isArray(rows) && rows && typeof rows === "object") rows = rows.items || rows.data || []; const l = Array.isArray(rows) ? rows.find(x => x.status === "ACTIVE") || rows[0] : null; return l && l.id;')
if [ -n "$LISTING_ID" ]; then pass "listing selected: $LISTING_ID"; else fail "no listing found"; fi

if [ -n "$DEALER_ID" ] && [ -n "$LISTING_ID" ]; then
  COLLECTION_DATE=$(date -u -d '+1 hour' '+%Y-%m-%dT%H:%M:%S.000Z' 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)+timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%S.000Z'))
PY
)
  expect_code "UC-COLL-01 admin creates/assigns collection" POST "/collections" "$ADMIN_TOKEN" "{\"listingId\":\"$LISTING_ID\",\"dealerId\":\"$DEALER_ID\",\"collectionDate\":\"$COLLECTION_DATE\"}" 201
  COLLECTION_ID=$(extract 'return obj.id || obj.collection?.id || obj.data?.id || "";')
  if [ -n "$COLLECTION_ID" ]; then pass "collection id: $COLLECTION_ID"; else fail "collection id missing"; fi
else
  COLLECTION_ID=""
fi

if [ -n "${COLLECTION_ID:-}" ]; then
  expect_code "UC-COLL list collections as admin" GET "/collections?limit=5" "$ADMIN_TOKEN" "" 200
  expect_code "UC-COLL get collection detail" GET "/collections/$COLLECTION_ID" "$ADMIN_TOKEN" "" 200

  LAT=$(extract 'return obj.listingLat ?? obj.listing?.latitude ?? 0;')
  LNG=$(extract 'return obj.listingLng ?? obj.listing?.longitude ?? 0;')
  [ -z "$LAT" ] && LAT=0
  [ -z "$LNG" ] && LNG=0

  for status in ACCEPTED EN_ROUTE; do
    expect_code "UC-COLL status transition $status" PATCH "/collections/$COLLECTION_ID/status" "$ADMIN_TOKEN" "{\"status\":\"$status\",\"notes\":\"UC10 smoke $status\"}" 200
  done

  expect_code "UC-COLL GPS verification near listing" POST "/collections/$COLLECTION_ID/verify-gps" "$ADMIN_TOKEN" "{\"latitude\":$LAT,\"longitude\":$LNG}" 200
  VERIFIED=$(extract 'return obj.verified === true ? "true" : "false";')
  if [ "$VERIFIED" = "true" ]; then pass "GPS verified near listing"; else warn "GPS verification returned false; check listing lat/lng test data"; fi

  expect_code "UC-COLL weight confirmation" PATCH "/collections/$COLLECTION_ID/weight" "$ADMIN_TOKEN" "{\"collectedWeight\":\"125.5\",\"notes\":\"UC10 smoke confirmed weight\"}" 200

  expect_code "UC-COLL status transition COLLECTED" PATCH "/collections/$COLLECTION_ID/status" "$ADMIN_TOKEN" "{\"status\":\"COLLECTED\"}" 200
  expect_code "UC-COLL status transition DELIVERED_TO_CENTER" PATCH "/collections/$COLLECTION_ID/status" "$ADMIN_TOKEN" "{\"status\":\"DELIVERED_TO_CENTER\"}" 200

  expect_code "UC-COLL dealer rating submit" POST "/collections/$COLLECTION_ID/rate" "$ADMIN_TOKEN" "{\"rating\":5,\"raterType\":\"seller\",\"comment\":\"UC10 smoke rating\"}" 200
  expect_code "UC-COLL dealer rating read" GET "/collections/dealer/$DEALER_ID/rating" "$ADMIN_TOKEN" "" 200
fi

# Carbon analytics should not crash even when no carbon credit records exist.
code=$(request GET "/collections/analytics/carbon" "$ADMIN_TOKEN" "")
if [ "$code" = "200" ]; then
  pass "UC-COLL carbon analytics endpoint returns 200"
else
  fail "UC-COLL carbon analytics expected 200 got $code"
fi

echo "----------------------------------------------------------------"
echo "UC-10 summary: PASSED=$PASS FAILED=$FAIL WARNINGS=$WARN"
[ "$FAIL" -eq 0 ]
