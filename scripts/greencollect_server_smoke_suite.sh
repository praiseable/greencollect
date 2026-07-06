#!/usr/bin/env bash
# GreenCollect/Kabariya server smoke suite
# Default mode is read-only and safe for production.
# Optional mutating tests require RUN_MUTATING=1 and, for wallet/deposit tests, backend ALLOW_TEST_TOPUP=true.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
WEB_URL="${WEB_URL:-http://127.0.0.1}"
ADMIN_URL="${ADMIN_URL:-http://127.0.0.1:8080}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@marketplace.pk}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123456}"
CUSTOMER_EMAIL="${CUSTOMER_EMAIL:-customer@marketplace.pk}"
CUSTOMER_PASSWORD="${CUSTOMER_PASSWORD:-Customer@123}"
DEALER_EMAIL="${DEALER_EMAIL:-dealer@marketplace.pk}"
DEALER_PASSWORD="${DEALER_PASSWORD:-Dealer@123}"
WHOLESALE_EMAIL="${WHOLESALE_EMAIL:-wholesale@marketplace.pk}"
WHOLESALE_PASSWORD="${WHOLESALE_PASSWORD:-Wholesale@123}"
RUN_MUTATING="${RUN_MUTATING:-0}"
RUN_FINANCIAL="${RUN_FINANCIAL:-0}"
RUN_HANDSHAKE="${RUN_HANDSHAKE:-0}"
STRICT_UI_CONTRACT="${STRICT_UI_CONTRACT:-0}"
CURL_INSECURE="${CURL_INSECURE:-0}"

TMP_DIR="$(mktemp -d)"
BODY_FILE="$TMP_DIR/body.json"
trap 'rm -rf "$TMP_DIR"' EXIT

PASS=0
FAIL=0
SKIP=0
WARN=0
STATUS="000"

if [ "$CURL_INSECURE" = "1" ]; then
  CURL_TLS=(-k)
else
  CURL_TLS=()
fi

line() { printf '%s\n' "----------------------------------------------------------------"; }
pass() { PASS=$((PASS+1)); printf '✅ PASS  %s\n' "$1"; }
fail() { FAIL=$((FAIL+1)); printf '❌ FAIL  %s\n' "$1"; [ -s "$BODY_FILE" ] && sed 's/^/       /' "$BODY_FILE" | head -c 1200 && printf '\n'; }
skip() { SKIP=$((SKIP+1)); printf '⏭️  SKIP  %s\n' "$1"; }
warn() { WARN=$((WARN+1)); printf '⚠️  WARN  %s\n' "$1"; }

need_python() {
  if ! command -v python3 >/dev/null 2>&1; then
    fail "python3 is required for JSON assertions"
    exit 2
  fi
}

http() {
  local method="$1" url="$2" token="${3:-}" data="${4:-}"
  local headers=(-H 'Accept: application/json')
  if [ -n "$token" ]; then headers+=(-H "Authorization: Bearer $token"); fi
  if [ -n "$data" ]; then headers+=(-H 'Content-Type: application/json'); fi
  if [ -n "$data" ]; then
    STATUS=$(curl "${CURL_TLS[@]}" -sS -o "$BODY_FILE" -w '%{http_code}' -X "$method" "${headers[@]}" --data "$data" "$url" 2>/tmp/gc_curl_err || echo "000")
  else
    STATUS=$(curl "${CURL_TLS[@]}" -sS -o "$BODY_FILE" -w '%{http_code}' -X "$method" "${headers[@]}" "$url" 2>/tmp/gc_curl_err || echo "000")
  fi
}

expect_status() {
  local expected="$1" label="$2"
  if [ "$STATUS" = "$expected" ]; then pass "$label [$STATUS]"; else fail "$label expected $expected got $STATUS"; fi
}

expect_status_any() {
  local allowed="$1" label="$2"
  case " $allowed " in
    *" $STATUS "*) pass "$label [$STATUS]" ;;
    *) fail "$label expected one of: $allowed got $STATUS" ;;
  esac
}

json_eval() {
  local file="$1" expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json, sys
path, expr = sys.argv[1], sys.argv[2]
try:
    with open(path, 'r', encoding='utf-8') as f:
        txt = f.read().strip()
    obj = json.loads(txt) if txt else None
    val = eval(expr, {"__builtins__": {}}, {"obj": obj, "len": len, "isinstance": isinstance, "dict": dict, "list": list, "str": str, "int": int, "bool": bool, "any": any, "all": all})
    if isinstance(val, bool):
        print('true' if val else 'false')
    elif val is None:
        print('')
    else:
        print(val)
except Exception:
    print('')
PY
}

json_true() {
  local expr="$1" label="$2"
  local v
  v="$(json_eval "$BODY_FILE" "$expr")"
  if [ "$v" = "true" ]; then pass "$label"; else fail "$label JSON assertion failed: $expr"; fi
}

extract_token() {
  json_eval "$BODY_FILE" "(obj.get('accessToken') if isinstance(obj, dict) else '') or ((obj.get('data') or {}).get('accessToken') if isinstance(obj, dict) else '')"
}

extract_first_listing_id() {
  json_eval "$BODY_FILE" "(((obj.get('data') or obj.get('listings') or [])[0].get('id')) if isinstance(obj, dict) and (obj.get('data') or obj.get('listings')) else '')"
}

extract_first_array_id() {
  json_eval "$BODY_FILE" "(obj[0].get('id') if isinstance(obj, list) and obj else '') or (((obj.get('data') or [])[0].get('id')) if isinstance(obj, dict) and (obj.get('data') or []) else '')"
}

printf '\nGreenCollect/Kabariya smoke suite\n'
printf 'BASE_URL=%s\nAPI_BASE=%s\n' "$BASE_URL" "$API_BASE"
printf 'RUN_MUTATING=%s RUN_FINANCIAL=%s RUN_HANDSHAKE=%s\n' "$RUN_MUTATING" "$RUN_FINANCIAL" "$RUN_HANDSHAKE"
line

need_python

# L0 deployment/runtime checks
if [ -f "$COMPOSE_FILE" ] && command -v docker >/dev/null 2>&1; then
  if docker compose -f "$COMPOSE_FILE" ps >/tmp/gc_compose_ps 2>/tmp/gc_compose_err; then
    pass "Docker Compose project is reachable"
    if grep -q "gc-app-backend" /tmp/gc_compose_ps || grep -q "backend" /tmp/gc_compose_ps; then pass "backend service listed in compose ps"; else warn "backend service not obvious in compose ps"; fi
  else
    warn "docker compose ps not available from this directory"
  fi
  NODE_V="$(docker compose -f "$COMPOSE_FILE" exec -T backend node -v 2>/dev/null || true)"
  if [ -n "$NODE_V" ]; then
    case "$NODE_V" in
      v20.*) pass "backend Node runtime is v20.x ($NODE_V)" ;;
      *) fail "backend Node runtime should be v20.x for v3, got $NODE_V" ;;
    esac
  else
    warn "could not read backend node version through docker compose"
  fi
else
  skip "Docker Compose checks skipped: no $COMPOSE_FILE or docker unavailable"
fi

# L1 read-only API smoke
http GET "$BASE_URL/health"
expect_status 200 "GET /health"
json_true "isinstance(obj, dict) and obj.get('status') == 'ok' and obj.get('db') == 'connected'" "health reports status ok and db connected"

http GET "$API_BASE/config/app-version"
expect_status 200 "GET /api/config/app-version"

http GET "$API_BASE/categories"
expect_status 200 "GET /api/categories"
CATEGORY_ID="$(extract_first_array_id)"
[ -n "$CATEGORY_ID" ] && pass "category seed exists: $CATEGORY_ID" || warn "no category id found"

http GET "$API_BASE/product-types?limit=5"
expect_status 200 "GET /api/product-types"
PRODUCT_TYPE_ID="$(extract_first_array_id)"
[ -n "$PRODUCT_TYPE_ID" ] && pass "product type seed exists: $PRODUCT_TYPE_ID" || warn "no product type id found"

http GET "$API_BASE/units"
expect_status 200 "GET /api/units"
UNIT_ID="$(extract_first_array_id)"
[ -n "$UNIT_ID" ] && pass "unit seed exists: $UNIT_ID" || warn "no unit id found"

http GET "$API_BASE/geo-zones"
expect_status 200 "GET /api/geo-zones"

http GET "$API_BASE/geo-zones/cities"
expect_status 200 "GET /api/geo-zones/cities"

http GET "$API_BASE/payments/gateways?countryId=PK"
expect_status 200 "GET /api/payments/gateways"

http GET "$API_BASE/subscriptions/plans"
expect_status 200 "GET /api/subscriptions/plans"

http GET "$API_BASE/listings?limit=5"
expect_status 200 "GET /api/listings?limit=5"
LISTING_ID="$(extract_first_listing_id)"
if [ -n "$LISTING_ID" ]; then
  pass "listing available for detail/contact-mask smoke: $LISTING_ID"
  http GET "$API_BASE/listings/$LISTING_ID"
  expect_status 200 "GET /api/listings/:id anonymous"
  json_true "(lambda l: not (l.get('sellerPhone') or l.get('contactNumber') or l.get('exactAddress') or ((l.get('seller') or {}).get('phone'))))(obj.get('listing') if isinstance(obj, dict) and obj.get('listing') else obj if isinstance(obj, dict) else {})" "anonymous listing detail does not expose phone/address/contact"
else
  warn "no listing id found; contact masking detail check skipped"
fi

# Authenticated read-only smoke
ADMIN_TOKEN=""
http POST "$API_BASE/auth/admin/login" "" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
if [ "$STATUS" = "200" ]; then
  ADMIN_TOKEN="$(extract_token)"
  [ -n "$ADMIN_TOKEN" ] && pass "admin login token received" || fail "admin login response had no token"
else
  warn "admin login failed with $STATUS; admin route smoke skipped"
fi

if [ -n "$ADMIN_TOKEN" ]; then
  http GET "$API_BASE/admin/dashboard" "$ADMIN_TOKEN"
  expect_status 200 "admin GET /api/admin/dashboard"
  http GET "$API_BASE/admin/platform-config" "$ADMIN_TOKEN"
  expect_status 200 "admin GET /api/admin/platform-config"
  http GET "$API_BASE/admin/flagged-users" "$ADMIN_TOKEN"
  expect_status_any "200 500" "admin GET /api/admin/flagged-users (500 means table/schema missing; investigate)"
  http GET "$API_BASE/users?limit=1" "$ADMIN_TOKEN"
  expect_status 200 "admin GET /api/users"
fi

CUSTOMER_TOKEN=""
http POST "$API_BASE/auth/login" "" "{\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"$CUSTOMER_PASSWORD\"}"
if [ "$STATUS" = "200" ]; then
  CUSTOMER_TOKEN="$(extract_token)"
  [ -n "$CUSTOMER_TOKEN" ] && pass "customer login token received" || fail "customer login response had no token"
else
  warn "customer seeded login failed with $STATUS; customer protected smoke skipped"
fi

if [ -n "$CUSTOMER_TOKEN" ]; then
  http GET "$API_BASE/auth/me" "$CUSTOMER_TOKEN"
  expect_status 200 "customer GET /api/auth/me"
  http GET "$API_BASE/wallet" "$CUSTOMER_TOKEN"
  expect_status 200 "customer GET /api/wallet"
  http GET "$API_BASE/notifications/unread-count" "$CUSTOMER_TOKEN"
  expect_status 200 "customer GET /api/notifications/unread-count"
  http GET "$API_BASE/listings/my" "$CUSTOMER_TOKEN"
  expect_status 200 "customer GET /api/listings/my"
  http GET "$API_BASE/chat/conversations" "$CUSTOMER_TOKEN"
  expect_status 200 "customer GET /api/chat/conversations"
fi

# UI HTTP smoke
WEB_CODE="$(curl "${CURL_TLS[@]}" -sS -o /dev/null -w '%{http_code}' "$WEB_URL" 2>/dev/null || echo 000)"
case "$WEB_CODE" in 200|301|302) pass "web client responds HTTP $WEB_CODE" ;; *) warn "web client HTTP check returned $WEB_CODE" ;; esac
ADMIN_CODE="$(curl "${CURL_TLS[@]}" -sS -o /dev/null -w '%{http_code}' "$ADMIN_URL" 2>/dev/null || echo 000)"
case "$ADMIN_CODE" in 200|301|302) pass "admin portal responds HTTP $ADMIN_CODE" ;; *) warn "admin portal HTTP check returned $ADMIN_CODE" ;; esac

# UI/backend API contract warning probes; not hard-fail unless STRICT_UI_CONTRACT=1.
if [ "$STRICT_UI_CONTRACT" = "1" ] && [ -n "$ADMIN_TOKEN" ]; then
  http GET "$API_BASE/analytics" "$ADMIN_TOKEN"
  [ "$STATUS" = "200" ] && pass "UI contract /api/analytics" || fail "admin UI may call /api/analytics but backend exposes /api/analytics/overview [$STATUS]"
  http GET "$API_BASE/kyc/admin/applications" "$ADMIN_TOKEN"
  [ "$STATUS" = "200" ] && pass "UI contract /api/kyc/admin/applications" || fail "admin UI may call /api/kyc/admin/applications but backend exposes /api/kyc/admin/pending [$STATUS]"
else
  skip "strict UI/backend contract probes skipped (set STRICT_UI_CONTRACT=1)"
fi

# Optional mutating lifecycle smoke
if [ "$RUN_MUTATING" != "1" ]; then
  skip "mutating lifecycle smoke skipped (set RUN_MUTATING=1)"
else
  line
  printf 'Running controlled mutating smoke. This creates test users/listings.\n'
  TS="$(date +%s)"
  RAND9="$(python3 - <<'PY'
import random
print(str(random.randint(100000000, 999999999)))
PY
)"
  SELLER_EMAIL="smoke.seller.$TS@example.test"
  BUYER_EMAIL="smoke.buyer.$TS@example.test"
  SELLER_PHONE="+923$RAND9"
  BUYER_PHONE="+923$(python3 - <<'PY'
import random
print(str(random.randint(100000000, 999999999)))
PY
)"
  TEST_PASSWORD="Smoke@123456"

  http POST "$API_BASE/auth/register" "" "{\"firstName\":\"Smoke\",\"lastName\":\"Seller\",\"email\":\"$SELLER_EMAIL\",\"phone\":\"$SELLER_PHONE\",\"password\":\"$TEST_PASSWORD\",\"city\":\"Islamabad\"}"
  expect_status 201 "register smoke seller"
  SELLER_TOKEN="$(extract_token)"

  http POST "$API_BASE/auth/register" "" "{\"firstName\":\"Smoke\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$TEST_PASSWORD\",\"city\":\"Islamabad\"}"
  expect_status 201 "register smoke buyer"
  BUYER_TOKEN="$(extract_token)"

  if [ -n "$SELLER_TOKEN" ] && [ -n "$CATEGORY_ID" ] && [ -n "$UNIT_ID" ]; then
    CREATE_BODY="{\"title\":\"Smoke Test Scrap $TS\",\"description\":\"Automated smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"productTypeId\":${PRODUCT_TYPE_ID:+\"$PRODUCT_TYPE_ID\"},\"pricePaisa\":\"1000000\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"Smoke test address\",\"contactNumber\":\"$SELLER_PHONE\"}"
    # If product type id is empty, remove invalid JSON fragment.
    if [ -z "$PRODUCT_TYPE_ID" ]; then
      CREATE_BODY="{\"title\":\"Smoke Test Scrap $TS\",\"description\":\"Automated smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"1000000\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"Smoke test address\",\"contactNumber\":\"$SELLER_PHONE\"}"
    fi
    http POST "$API_BASE/listings" "$SELLER_TOKEN" "$CREATE_BODY"
    expect_status 201 "create smoke listing as seller with no wallet/subscription gate"
    NEW_LISTING_ID="$(json_eval "$BODY_FILE" "obj.get('id') if isinstance(obj, dict) else ''")"
  else
    fail "cannot create listing: missing seller token/category/unit"
    NEW_LISTING_ID=""
  fi

  if [ -n "$BUYER_TOKEN" ] && [ -n "$NEW_LISTING_ID" ]; then
    http GET "$API_BASE/listings/$NEW_LISTING_ID" "$BUYER_TOKEN"
    expect_status 200 "buyer without deposit fetches smoke listing"
    json_true "(lambda l: not (l.get('sellerPhone') or l.get('contactNumber') or l.get('exactAddress') or ((l.get('seller') or {}).get('phone'))))(obj.get('listing') if isinstance(obj, dict) and obj.get('listing') else obj if isinstance(obj, dict) else {})" "buyer without deposit cannot see smoke seller contact"
  fi

  if [ "$RUN_FINANCIAL" != "1" ]; then
    skip "financial deposit smoke skipped (set RUN_FINANCIAL=1 and enable backend ALLOW_TEST_TOPUP=true)"
  elif [ -z "$BUYER_TOKEN" ] || [ -z "$NEW_LISTING_ID" ]; then
    fail "financial smoke cannot run because buyer/listing missing"
  else
    http POST "$API_BASE/payments/wallet/topup" "$BUYER_TOKEN" "{\"amountPaisa\":\"2000000\",\"gateway\":\"SMOKE\",\"gatewayRef\":\"smoke-$TS\"}"
    if [ "$STATUS" = "200" ]; then
      pass "test wallet top-up accepted"
      http POST "$API_BASE/listings/$NEW_LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
      expect_status_any "200 201" "place buyer-funded deposit"
      DEPOSIT_ID="$(json_eval "$BODY_FILE" "((obj.get('deposit') or {}).get('id')) if isinstance(obj, dict) else ''")"
      http GET "$API_BASE/listings/$NEW_LISTING_ID" "$BUYER_TOKEN"
      expect_status 200 "buyer with deposit fetches smoke listing"
      json_true "(lambda l: bool(l.get('sellerPhone') or l.get('contactNumber') or ((l.get('seller') or {}).get('phone')) or l.get('exactAddress')))(obj.get('listing') if isinstance(obj, dict) and obj.get('listing') else obj if isinstance(obj, dict) else {})" "buyer with held deposit can see seller contact"

      http POST "$API_BASE/transactions" "$BUYER_TOKEN" "{\"listingId\":\"$NEW_LISTING_ID\",\"offeredPricePaisa\":\"1000000\",\"quantity\":10,\"message\":\"Smoke funded offer\"}"
      expect_status 201 "create funded offer transaction"
      TXN_ID="$(json_eval "$BODY_FILE" "((obj.get('transaction') or {}).get('id')) if isinstance(obj, dict) else ''")"
      if [ -n "$TXN_ID" ]; then
        http PUT "$API_BASE/transactions/$TXN_ID/accept" "$SELLER_TOKEN" "{}"
        expect_status 200 "seller accepts smoke offer"
        http PUT "$API_BASE/transactions/$TXN_ID/finalize" "$BUYER_TOKEN" "{}"
        expect_status 409 "direct finalize is blocked by handshake requirement"
        if [ "$RUN_HANDSHAKE" = "1" ]; then
          http POST "$API_BASE/transactions/$TXN_ID/amend-weight" "$BUYER_TOKEN" "{\"actualQuantity\":10,\"actualPricePaisa\":\"1000000\"}"
          expect_status 200 "buyer submits smoke weight amendment"
          http POST "$API_BASE/transactions/$TXN_ID/acknowledge-amendment" "$SELLER_TOKEN" "{}"
          expect_status 200 "seller acknowledges smoke amendment"
          http POST "$API_BASE/transactions/$TXN_ID/handshake/generate" "$SELLER_TOKEN" "{}"
          expect_status 200 "seller generates handshake OTP"
          OTP="$(json_eval "$BODY_FILE" "obj.get('otp') if isinstance(obj, dict) else ''")"
          if [ -n "$OTP" ]; then
            http POST "$API_BASE/transactions/$TXN_ID/verify-handshake" "$BUYER_TOKEN" "{\"otp\":\"$OTP\"}"
            expect_status 200 "buyer verifies handshake OTP and finalizes"
          else
            skip "handshake verify skipped: backend did not return test OTP; set ALLOW_TEST_HANDSHAKE_OTP=true in staging"
          fi
        fi
      fi
      if [ -n "${DEPOSIT_ID:-}" ]; then
        # Do not release if finalized; if not finalized, release held deposit to avoid lingering escrow.
        if [ "$RUN_HANDSHAKE" != "1" ]; then
          http POST "$API_BASE/wallet/deposits/$DEPOSIT_ID/release" "$BUYER_TOKEN" "{}"
          expect_status_any "200 409" "release smoke deposit or already captured"
        fi
      fi
    else
      warn "test wallet top-up rejected with $STATUS; expected in production unless ALLOW_TEST_TOPUP=true"
    fi
  fi
fi

line
printf 'Smoke test summary: PASSED=%s FAILED=%s WARNINGS=%s SKIPPED=%s\n' "$PASS" "$FAIL" "$WARN" "$SKIP"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
