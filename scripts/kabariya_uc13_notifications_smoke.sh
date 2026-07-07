#!/usr/bin/env bash
# Kabariya v3 UC-13 notifications smoke test.
# Runs on the Linux server from ~/gc-app. Creates test users/listings/transactions and
# verifies event notifications, deep-link metadata, unread counts, mark-read semantics,
# subscription expiry notices, dispute notices, and KYC status notices.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
API_BASE="${API_BASE:-${BASE_URL%/}/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TOPUP_PAISA="${TOPUP_PAISA:-3000000}"
PRICE_PAISA="${PRICE_PAISA:-1000000}"
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

extract_token(){ json_value "obj.accessToken || obj.token || obj?.data?.accessToken || obj?.data?.token"; }
extract_user_id(){ json_value "obj.user?.id || obj.data?.user?.id || obj.data?.id"; }

has_notification(){
  local token="$1" expr="$2" msg="$3"
  http GET "/notifications?limit=100" "$token"
  if [ "$STATUS" != "200" ]; then fail "$msg — notifications endpoint expected 200 got $STATUS"; return; fi
  if node -e "const fs=require('fs'); const obj=JSON.parse(fs.readFileSync('$BODY','utf8')); const list=obj.data||obj.notifications||[]; if (!list.some((n)=>{ const data=n.data||{}; return ($expr); })) process.exit(1);" 2>/dev/null; then
    pass "$msg"
  else
    fail "$msg"
  fi
}

first_notification_id(){
  local token="$1"
  http GET "/notifications?limit=100" "$token"
  json_value "(obj.data||obj.notifications||[])[0]?.id"
}

extract_seller_handshake_otp(){
  local token="$1" txn_id="$2"
  http GET "/notifications?limit=100" "$token"
  if [ "$STATUS" != "200" ]; then return; fi
  node - <<NODE 2>/dev/null || true
const fs = require('fs');
const obj = JSON.parse(fs.readFileSync('$BODY','utf8'));
const list = obj.data || obj.notifications || [];
const row = list.find((n) => {
  const data = n.data || {};
  return data.transactionId === '$txn_id' && (data.event === 'SECURE_HANDSHAKE_OTP' || /pickup OTP/i.test(n.body || ''));
});
const match = row && String(row.body || '').match(/\b(\d{6})\b/);
if (match) console.log(match[1]);
NODE
}

printf 'Kabariya UC-13 notifications/event-center smoke\n'
printf 'API_BASE=%s COMPOSE_FILE=%s\n' "$API_BASE" "$COMPOSE_FILE"
line

if ! docker compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
  fail "docker compose project not reachable from current directory"
  printf 'UC-13 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
  exit 1
fi
pass "docker compose project reachable"

http GET /notifications
expect 401 "UC-NOTIF security: anonymous GET /notifications rejected"

# Admin login
http POST /auth/admin/login "" '{"email":"admin@marketplace.pk","password":"Admin@123456"}'
expect 200 "Admin portal login"
ADMIN_TOKEN="$(extract_token)"
[ -n "$ADMIN_TOKEN" ] && pass "admin token present" || fail "admin token missing"

# Catalog/deep-link contract
http GET /notifications/catalog "$ADMIN_TOKEN"
expect 200 "UC-NOTIF catalog endpoint returns event catalog"
json_assert "(()=>{const rows=obj.data||[]; const events=rows.map(x=>x.event); return ['DEPOSIT_PLACED','DEPOSIT_REFUNDED','OFFER_RECEIVED','OFFER_ACCEPTED','OFFER_REJECTED','CHAT_MESSAGE','DEAL_FINALIZED','BOND_READY','DISPUTE_OPENED','DISPUTE_RESOLVED','KYC_STATUS','SUBSCRIPTION_EXPIRING','SUBSCRIPTION_EXPIRED'].every(e=>events.includes(e));})()" "notification catalog contains required UC-NOTIF events"

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
PASSWORD="Smoke@123456"
SELLER_EMAIL="uc13.seller.$TS@example.test"
BUYER_EMAIL="uc13.buyer.$TS@example.test"
KYC_APPROVE_EMAIL="uc13.kyc.approve.$TS@example.test"
KYC_REJECT_EMAIL="uc13.kyc.reject.$TS@example.test"
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
KYC_APPROVE_PHONE="+923$(python3 - <<'PY'
import random
print(random.randint(100000000,999999999))
PY
)"
KYC_REJECT_PHONE="+923$(python3 - <<'PY'
import random
print(random.randint(100000000,999999999))
PY
)"

http POST /auth/register "" "{\"firstName\":\"UC13\",\"lastName\":\"Seller\",\"email\":\"$SELLER_EMAIL\",\"phone\":\"$SELLER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register notification-test seller"
SELLER_TOKEN="$(extract_token)"
SELLER_ID="$(extract_user_id)"
[ -n "$SELLER_TOKEN" ] && pass "seller token present" || fail "seller token missing"
[ -n "$SELLER_ID" ] && pass "seller id present" || fail "seller id missing"

http POST /auth/register "" "{\"firstName\":\"UC13\",\"lastName\":\"Buyer\",\"email\":\"$BUYER_EMAIL\",\"phone\":\"$BUYER_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register notification-test buyer"
BUYER_TOKEN="$(extract_token)"
BUYER_ID="$(extract_user_id)"
[ -n "$BUYER_TOKEN" ] && pass "buyer token present" || fail "buyer token missing"
[ -n "$BUYER_ID" ] && pass "buyer id present" || fail "buyer id missing"

# Start notification center with clean read state for deterministic unread checks.
http PUT /notifications/read-all "$SELLER_TOKEN"
expect 200 "seller mark all notifications read"
http PUT /notifications/read-all "$BUYER_TOKEN"
expect 200 "buyer mark all notifications read"

# Top up buyer wallet through ledger service.
if docker compose -f "$COMPOSE_FILE" exec -T \
  -e BUYER_EMAIL="$BUYER_EMAIL" \
  -e TOPUP_PAISA="$TOPUP_PAISA" \
  backend node <<'NODE' >/tmp/uc13_topup.out 2>/tmp/uc13_topup.err
const prisma = require('./src/services/prisma');
const { creditWallet } = require('./src/services/wallet.service');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  if (!user) throw new Error('buyer not found');
  const wallet = await creditWallet(user.id, BigInt(process.env.TOPUP_PAISA), {
    referenceType: 'TOPUP',
    referenceId: `uc13-smoke-${Date.now()}`,
    note: 'UC13 notification smoke top-up',
  });
  console.log(JSON.stringify({ userId: user.id, availableBalancePaisa: wallet.availableBalancePaisa.toString() }));
  await prisma.$disconnect();
})().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
then
  pass "buyer wallet credited for notification smoke"
else
  fail "buyer wallet top-up failed"
  cat /tmp/uc13_topup.err 2>/dev/null || true
fi

# Listing + deposit => seller DEPOSIT_PLACED notification.
LISTING_BODY="{\"title\":\"UC13 Notification Listing $TS\",\"description\":\"UC13 event smoke listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC13 exact pickup address\",\"contactNumber\":\"$SELLER_PHONE\"}"
http POST /listings "$SELLER_TOKEN" "$LISTING_BODY"
expect 201 "seller creates listing for notification smoke"
LISTING_ID="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
[ -n "$LISTING_ID" ] && pass "listing id: $LISTING_ID" || fail "listing id missing"

http POST "/listings/$LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "buyer places deposit for notification smoke"
DEPOSIT_ID="$(json_value "obj.deposit?.id || obj.data?.deposit?.id")"
[ -n "$DEPOSIT_ID" ] && pass "deposit id: $DEPOSIT_ID" || fail "deposit id missing"
has_notification "$SELLER_TOKEN" "data.event==='DEPOSIT_PLACED' && data.listingId==='$LISTING_ID'" "seller receives DEPOSIT_PLACED notification"

# Mark-read ownership and unread count.
SELLER_NOTIF_ID="$(first_notification_id "$SELLER_TOKEN")"
if [ -n "$SELLER_NOTIF_ID" ]; then
  http PATCH "/notifications/$SELLER_NOTIF_ID/read" "$BUYER_TOKEN"
  expect 404 "buyer cannot mark seller notification as read"
  http PATCH "/notifications/$SELLER_NOTIF_ID/read" "$SELLER_TOKEN"
  expect 200 "seller can mark own notification as read"
else
  fail "seller notification id missing for mark-read tests"
fi

# Chat notification.
http POST "/chat/$SELLER_ID" "$BUYER_TOKEN" "{\"message\":\"UC13 chat notification $TS\"}"
expect 201 "buyer sends post-deposit chat message"
has_notification "$SELLER_TOKEN" "data.event==='CHAT_MESSAGE' && data.fromUserId==='$BUYER_ID'" "seller receives CHAT_MESSAGE notification with chat deep-link data"

# Offer received/accepted + finalized/bond notifications.
http POST /transactions "$BUYER_TOKEN" "{\"listingId\":\"$LISTING_ID\",\"offeredPricePaisa\":\"$PRICE_PAISA\",\"quantity\":10,\"message\":\"UC13 funded offer\"}"
expect 201 "buyer submits funded offer"
TXN_ID="$(json_value "obj.transaction?.id || obj.id")"
[ -n "$TXN_ID" ] && pass "transaction id: $TXN_ID" || fail "transaction id missing"
has_notification "$SELLER_TOKEN" "data.event==='OFFER_RECEIVED' && data.transactionId==='$TXN_ID'" "seller receives OFFER_RECEIVED notification"

http PUT "/transactions/$TXN_ID/accept" "$SELLER_TOKEN" "{}"
expect 200 "seller accepts funded offer"
has_notification "$BUYER_TOKEN" "data.event==='OFFER_ACCEPTED' && data.transactionId==='$TXN_ID'" "buyer receives OFFER_ACCEPTED notification"

http POST "/transactions/$TXN_ID/amend-weight" "$BUYER_TOKEN" "{\"actualQuantity\":10,\"actualPricePaisa\":\"$PRICE_PAISA\"}"
expect 200 "buyer submits amendment before notification finalization"
http POST "/transactions/$TXN_ID/acknowledge-amendment" "$SELLER_TOKEN" "{}"
expect 200 "seller acknowledges amendment before notification finalization"
http POST "/transactions/$TXN_ID/handshake/generate" "$SELLER_TOKEN" "{}"
expect 200 "seller generates handshake OTP for notification finalization"
OTP="$(json_value "obj.otp")"
if [ -z "$OTP" ]; then
  # Production correctly does not return OTP in the API payload. For smoke, read
  # it as the seller from the seller-only notification center. This preserves the
  # buyer-side security invariant while keeping the runtime test deterministic.
  OTP="$(extract_seller_handshake_otp "$SELLER_TOKEN" "$TXN_ID")"
fi
[ -n "$OTP" ] && pass "seller-side OTP obtained for notification smoke" || fail "OTP missing from seller-only delivery channel"
http POST "/transactions/$TXN_ID/verify-handshake" "$BUYER_TOKEN" "{\"otp\":\"$OTP\"}"
expect 200 "buyer verifies handshake and finalizes notification transaction"
BOND_ID="$(json_value "obj.bond?.id")"
[ -n "$BOND_ID" ] && pass "bond id present after notification finalization" || fail "bond id missing"
has_notification "$BUYER_TOKEN" "data.event==='DEAL_FINALIZED' && data.transactionId==='$TXN_ID'" "buyer receives DEAL_FINALIZED notification"
has_notification "$SELLER_TOKEN" "data.event==='DEAL_FINALIZED' && data.transactionId==='$TXN_ID'" "seller receives DEAL_FINALIZED notification"
has_notification "$BUYER_TOKEN" "data.event==='BOND_READY' && data.bondId==='$BOND_ID' && String(data.deepLink||'').includes('$BOND_ID')" "buyer receives BOND_READY notification with deep-link"
has_notification "$SELLER_TOKEN" "data.event==='BOND_READY' && data.bondId==='$BOND_ID'" "seller receives BOND_READY notification"

# Offer rejected notification on a second listing/deposit.
http POST /listings "$SELLER_TOKEN" "{\"title\":\"UC13 Reject Listing $TS\",\"description\":\"UC13 reject event listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":5,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC13 reject address\",\"contactNumber\":\"$SELLER_PHONE\"}"
expect 201 "seller creates listing for offer rejection notification"
REJECT_LISTING_ID="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
http POST "/listings/$REJECT_LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "buyer places deposit for offer rejection listing"
http POST /transactions "$BUYER_TOKEN" "{\"listingId\":\"$REJECT_LISTING_ID\",\"offeredPricePaisa\":\"$PRICE_PAISA\",\"quantity\":5,\"message\":\"UC13 reject offer\"}"
expect 201 "buyer submits offer to be rejected"
REJECT_TXN_ID="$(json_value "obj.transaction?.id || obj.id")"
http PUT "/transactions/$REJECT_TXN_ID/reject" "$SELLER_TOKEN" "{}"
expect 200 "seller rejects funded offer"
has_notification "$BUYER_TOKEN" "data.event==='OFFER_REJECTED' && data.transactionId==='$REJECT_TXN_ID'" "buyer receives OFFER_REJECTED notification"

# Deposit refunded notification via buyer release on a third listing.
http POST /listings "$SELLER_TOKEN" "{\"title\":\"UC13 Refund Listing $TS\",\"description\":\"UC13 refund event listing\",\"categoryId\":\"$CATEGORY_ID\",\"pricePaisa\":\"$PRICE_PAISA\",\"quantity\":5,\"unitId\":\"$UNIT_ID\",\"cityName\":\"Islamabad\",\"address\":\"UC13 refund address\",\"contactNumber\":\"$SELLER_PHONE\"}"
expect 201 "seller creates listing for deposit refund notification"
REFUND_LISTING_ID="$(json_value "obj.id || obj.data?.id || obj.listing?.id")"
http POST "/listings/$REFUND_LISTING_ID/deposit" "$BUYER_TOKEN" "{}"
expect_any "200 201" "buyer places refundable deposit"
REFUND_DEPOSIT_ID="$(json_value "obj.deposit?.id || obj.data?.deposit?.id")"
http POST "/wallet/deposits/$REFUND_DEPOSIT_ID/release" "$BUYER_TOKEN" "{}"
expect 200 "buyer releases deposit"
has_notification "$BUYER_TOKEN" "data.event==='DEPOSIT_REFUNDED' && data.depositId==='$REFUND_DEPOSIT_ID'" "buyer receives DEPOSIT_REFUNDED notification"

# Dispute notifications use the finalized transaction from above.
http POST /disputes "$BUYER_TOKEN" "{\"transactionId\":\"$TXN_ID\",\"reason\":\"UC13_NOTIFICATION_DISPUTE\",\"description\":\"UC13 dispute notification smoke\"}"
expect 201 "buyer opens dispute for notification smoke"
DISPUTE_ID="$(json_value "obj.dispute?.id || obj.id")"
[ -n "$DISPUTE_ID" ] && pass "dispute id: $DISPUTE_ID" || fail "dispute id missing"
has_notification "$BUYER_TOKEN" "data.event==='DISPUTE_OPENED' && data.disputeId==='$DISPUTE_ID'" "buyer receives DISPUTE_OPENED notification"
has_notification "$SELLER_TOKEN" "data.event==='DISPUTE_OPENED' && data.disputeId==='$DISPUTE_ID'" "seller receives DISPUTE_OPENED notification"
http PATCH "/disputes/$DISPUTE_ID/resolve" "$ADMIN_TOKEN" "{\"resolution\":\"award_seller\",\"note\":\"UC13 notification smoke resolution\"}"
expect 200 "admin resolves dispute for notification smoke"
has_notification "$BUYER_TOKEN" "data.event==='DISPUTE_RESOLVED' && data.disputeId==='$DISPUTE_ID'" "buyer receives DISPUTE_RESOLVED notification"
has_notification "$SELLER_TOKEN" "data.event==='DISPUTE_RESOLVED' && data.disputeId==='$DISPUTE_ID'" "seller receives DISPUTE_RESOLVED notification"

# Subscription expiring/expired notifications.
http GET /subscriptions/plans
expect 200 "public buyer premium plans available for notification subscription test"
PLAN_ID="$(json_value "(()=>{const rows=Array.isArray(obj)?obj:(obj.data||[]); const pro=rows.find(p=>String(p.slug||'').includes('pro'))||rows.find(p=>p.buyerPremium)||rows[0]; return pro&&pro.id;})()")"
if [ -n "$PLAN_ID" ]; then
  http POST /subscriptions/subscribe "$BUYER_TOKEN" "{\"planId\":\"$PLAN_ID\",\"interval\":\"MONTHLY\",\"currencyId\":\"PKR\"}"
  expect 200 "buyer purchases subscription for notification test"
  if docker compose -f "$COMPOSE_FILE" exec -T -e BUYER_EMAIL="$BUYER_EMAIL" backend node <<'NODE' >/tmp/uc13_sub_expire.out 2>/tmp/uc13_sub_expire.err
const prisma = require('./src/services/prisma');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  const sub = await prisma.userSubscription.findUnique({ where: { userId: user.id } });
  await prisma.userSubscription.update({ where: { id: sub.id }, data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + 24*60*60*1000) } });
  console.log(JSON.stringify({ subscriptionId: sub.id }));
  await prisma.$disconnect();
})().catch(async (err)=>{ console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
  then
    pass "buyer subscription set to expire soon for warning test"
    http POST /subscriptions/maintenance/warn-expiring "$ADMIN_TOKEN" "{\"days\":7}"
    expect 200 "admin runs subscription expiring warning sweep"
    has_notification "$BUYER_TOKEN" "data.event==='SUBSCRIPTION_EXPIRING'" "buyer receives SUBSCRIPTION_EXPIRING notification"
  else
    fail "failed to set subscription expiry for warning test"
  fi
  if docker compose -f "$COMPOSE_FILE" exec -T -e BUYER_EMAIL="$BUYER_EMAIL" backend node <<'NODE' >/tmp/uc13_sub_past.out 2>/tmp/uc13_sub_past.err
const prisma = require('./src/services/prisma');
(async () => {
  const user = await prisma.user.findUnique({ where: { email: process.env.BUYER_EMAIL } });
  const sub = await prisma.userSubscription.findUnique({ where: { userId: user.id } });
  await prisma.userSubscription.update({ where: { id: sub.id }, data: { status: 'ACTIVE', expiresAt: new Date(Date.now() - 60*1000) } });
  console.log(JSON.stringify({ subscriptionId: sub.id }));
  await prisma.$disconnect();
})().catch(async (err)=>{ console.error(err); await prisma.$disconnect(); process.exit(1); });
NODE
  then
    pass "buyer subscription set to expired for expiry test"
    http POST /subscriptions/maintenance/expire-due "$ADMIN_TOKEN" "{}"
    expect 200 "admin runs subscription expiry sweep"
    has_notification "$BUYER_TOKEN" "data.event==='SUBSCRIPTION_EXPIRED'" "buyer receives SUBSCRIPTION_EXPIRED notification"
  else
    fail "failed to set subscription to past date"
  fi
else
  fail "buyer premium plan missing for subscription notification test"
fi

# KYC status notifications.
http POST /auth/register "" "{\"firstName\":\"UC13\",\"lastName\":\"KycApprove\",\"email\":\"$KYC_APPROVE_EMAIL\",\"phone\":\"$KYC_APPROVE_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register KYC approval notification user"
KYC_APPROVE_TOKEN="$(extract_token)"
KYC_APPROVE_ID="$(extract_user_id)"
http POST "/kyc/admin/$KYC_APPROVE_ID/approve" "$ADMIN_TOKEN" "{}"
expect 200 "admin approves KYC user"
has_notification "$KYC_APPROVE_TOKEN" "data.event==='KYC_STATUS' && data.status==='APPROVED'" "approved user receives KYC_STATUS notification"

http POST /auth/register "" "{\"firstName\":\"UC13\",\"lastName\":\"KycReject\",\"email\":\"$KYC_REJECT_EMAIL\",\"phone\":\"$KYC_REJECT_PHONE\",\"password\":\"$PASSWORD\",\"city\":\"Islamabad\"}"
expect 201 "register KYC rejection notification user"
KYC_REJECT_TOKEN="$(extract_token)"
KYC_REJECT_ID="$(extract_user_id)"
http POST "/kyc/admin/$KYC_REJECT_ID/reject" "$ADMIN_TOKEN" "{\"reason\":\"UC13 notification rejection test\"}"
expect 200 "admin rejects KYC user"
has_notification "$KYC_REJECT_TOKEN" "data.event==='KYC_STATUS' && data.status==='REJECTED'" "rejected user receives KYC_STATUS notification"

# Final notification center behavior: unread count and read-all sync.
http GET /notifications/unread-count "$BUYER_TOKEN"
expect 200 "buyer unread-count endpoint returns 200"
BUYER_UNREAD="$(json_value "obj.count || obj.unreadCount || obj.data?.count || 0")"
if [ "${BUYER_UNREAD:-0}" -gt 0 ] 2>/dev/null; then pass "buyer unread count is positive before read-all ($BUYER_UNREAD)"; else warn "buyer unread count is not positive before read-all ($BUYER_UNREAD)"; fi
http PUT /notifications/read-all "$BUYER_TOKEN"
expect 200 "buyer read-all endpoint returns 200"
http GET /notifications/unread-count "$BUYER_TOKEN"
expect 200 "buyer unread-count endpoint returns 200 after read-all"
FINAL_UNREAD="$(json_value "obj.count || obj.unreadCount || obj.data?.count || 0")"
[ "${FINAL_UNREAD:-999}" = "0" ] && pass "buyer unread count syncs to zero after read-all" || fail "buyer unread count expected 0 after read-all got ${FINAL_UNREAD:-missing}"

line
printf 'UC-13 summary: PASSED=%s FAILED=%s WARNINGS=%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
