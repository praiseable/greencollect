# Kabariya Spec — End-to-End System Flow Validation

This document validates the **complete end-to-end system flow** against `kabariya-complete-spec.md` for the current stack (Express + Prisma backend, Flutter mobile, React web-admin).

---

## 1. AUTHENTICATION FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **POST /auth/send-otp** — Body: phone, role; normalize phone; check user suspended → 403 | `POST /api/auth/otp/send` and `/v1/auth/otp/send`. Checks `accountStatus` SUSPENDED/REJECTED → 403 `ACCOUNT_SUSPENDED`. Phone normalized. | ✅ PASS |
| Cooldown (60s) → 429 | In-memory `otpStore` enforces 60s; returns 429 `OTP_COOLDOWN`. | ✅ PASS |
| Lockout (Redis otp_lock) → 423 | In-memory lockout after 5 failed attempts, 15 min; returns 423 `OTP_LOCKED`. | ✅ PASS (Redis optional) |
| Store OTP hashed (bcrypt), expires_at | OTP stored **plain** in DB (not hashed). Expires 5 min. | ⚠️ GAP — spec says hash with bcrypt(10) |
| **POST /auth/verify-otp** — Body: phone, code, role | `POST /api/auth/otp/verify` and `/v1/auth/verify-otp`. Accepts `code` or `otp`. | ✅ PASS |
| Lockout check → 423; wrong code → 400 + attemptsLeft; 5 fails → lock | Implemented via `otpStore`. | ✅ PASS |
| Upsert user; generateTokens; store refresh token | Find or create user; tokens stored. Refresh token stored **raw** (spec: token_hash with bcrypt). | ⚠️ PARTIAL — no token hash |
| Response: user + accessToken + refreshToken | Returns `user`, `accessToken`, `refreshToken` at top level (mobile-compat). | ✅ PASS |
| **POST /auth/refresh** — Revoke old token, issue new pair | `POST /api/auth/refresh-token`. Deletes old token, creates new. No bcrypt compare on token. | ⚠️ PARTIAL — no hash/revoke flag |
| **POST /auth/logout** — Revoke refresh token (body) | `POST /api/auth/logout`. Deletes **all** refresh tokens for user; does not require body. | ⚠️ PARTIAL |
| **POST /auth/admin-login** — email + password, role admin/super_admin | **Not found.** Only `/api/auth/login` (email/phone + password). | ❌ GAP |
| **GET /config/app-version?platform=** | `GET /api/config/app-version` and `/v1/config/app-version`. Reads PlatformConfig. | ✅ PASS |
| **Middleware:** verifyToken, requireRole, requireKyc, requireSubscription, requireBalance | `authenticate`, `authorize(...roles)`, `optionalAuth` exist. No dedicated requireKyc / requireSubscription / requireBalance. | ⚠️ PARTIAL |
| **Rate limiters:** global, auth, otp per phone | No rate limit middleware found. | ❌ GAP |

**Auth summary:** Core OTP and app-version work. Gaps: admin-login, OTP/refresh token hashing, rate limiters, optional requireKyc/requireSubscription.

---

## 2. USER MANAGEMENT FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **GET /users/me** | No `/users/me`. Profile via `GET /api/auth/me`. Users list is `GET /api/users` (admin). | ⚠️ PARTIAL — spec path is /users/me |
| **PATCH /users/me** (name, email, city) | `PUT /api/users/:id` allows self-update (firstName, lastName, city, etc.). | ✅ PASS (path differs) |
| **PATCH /users/me/notification-preferences** | Not found. | ❌ GAP |
| **POST /users/me/fcm-token** | Not found. | ❌ GAP |
| **GET /users/:id/ratings** | Not found. | ❌ GAP |
| **GET /users/:id/rating-summary** | Not found. | ❌ GAP |
| **POST/DELETE /users/:id/block** | Not found. | ❌ GAP |
| **Admin: GET /admin/users** (filters, pagination) | `GET /api/users` with role, search, isActive, page, limit. | ✅ PASS |
| **Admin: GET /admin/users/:id** | `GET /api/users/:id` with geoZone, subscription, wallet, _count. | ✅ PASS |
| **Admin: suspend, unsuspend, ban, role** | `PUT /api/users/:id/toggle` (active/inactive). `PUT /api/users/:id/role`. No dedicated suspend/unsuspend/ban with reason. | ⚠️ PARTIAL |

**Mobile:** Uses baseUrl `/v1`. There is **no** `/v1/users` mount — so `/v1/users/me` would 404. Profile is likely via `/api/auth/me` if mobile ever calls it; need to confirm base URL for web vs API.

---

## 3. LISTINGS FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **GET /listings** — q, category_id, city, area, sort, page, limit; status=active, deleted_at null | `GET /api/listings` and `/v1/listings`. Has search, categoryId, productTypeId, cityName, min/max price, status, geo-fencing. | ✅ PASS |
| Pro dealer: filter by user_territories / city+areas | Geo-fencing via `buildGeoFenceWhere`; dealers see by territory. | ✅ PASS |
| **GET /listings/favorites** | `GET /api/listings/favorites` and `/v1/listings/favorites` (paginated). | ✅ PASS |
| **GET /listings/my** | Not found. | ❌ GAP |
| **GET /listings/:id** (increment view_count) | `GET /api/listings/:id`. Increments viewCount. | ✅ PASS |
| **POST /listings** (create; requireKyc for Pro) | `POST /api/listings`. No requireKyc middleware. | ⚠️ PARTIAL |
| **PATCH /listings/:id** (owner only) | `PUT /api/listings/:id`. Owner or admin. | ✅ PASS |
| **PATCH /listings/:id/deactivate** | Not found (only PUT for status in update). | ⚠️ GAP |
| **PATCH /listings/:id/reactivate** | Not found. | ❌ GAP |
| **DELETE /listings/:id** (soft) | `DELETE /api/listings/:id` sets status to CLOSED (not soft delete with deleted_at). | ⚠️ PARTIAL |
| **POST /listings/:id/favorite** (toggle) | Implemented. | ✅ PASS |
| **POST /listings/:id/report** — reason; auto-flag at 5 | Implemented; notifies admins via Socket. | ✅ PASS |
| Admin: listings list, deactivate, clear-flag, delete | `GET /api/admin/all-listings`, `PUT /api/admin/listings/:id/status`. No dedicated clear-flag. | ⚠️ PARTIAL |

---

## 4. CHAT FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **Chat model:** chat_rooms (participant_1, participant_2, listing_id), chat_messages (room_id, type text\|image) | Schema: **user-to-user** (ChatMessage: fromUserId, toUserId). No chat_rooms or listing_id. | ❌ GAP — different model |
| **POST /chat/rooms** — create or get (listingId?, recipientId) | Not found. Conversations derived from messages: `GET /api/chat/conversations`. | ⚠️ PARTIAL |
| **GET /chat/rooms** — lastMessage, unreadCount | Conversations list with last message; no unreadCount per room. | ⚠️ PARTIAL |
| **GET /chat/rooms/:id/messages?page=1** (30 per page) | `GET /api/chat/:userId` (messages with that user), paginated. No room id. | ⚠️ PARTIAL |
| **POST /chat/rooms/:id/media** (image upload) | Not found. Only `POST /api/chat/:userId` with text message. | ❌ GAP |
| **Socket:** join_room, send_message, mark_read; auth via JWT | Socket: join-room(userId), join-chat(userIds), send-message. No room-based or JWT auth on socket. | ⚠️ PARTIAL |
| Blocked users: reject message | Not implemented. | ❌ GAP |

---

## 5. TRANSACTIONS & NEGOTIATION FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **Offers table** (per-offer rows with status, expires_at) | No Offer model. Transaction has single amount (spec: multiple offers per transaction). | ❌ GAP |
| **POST /transactions** — Body: listingId | `POST /api/transactions` with listingId, offeredPricePaisa, quantity, message. Creates one Transaction. | ✅ PASS (simplified) |
| **GET /transactions** (own, filter status) | `GET /api/transactions` with status, page, limit. | ✅ PASS |
| **GET /transactions/:id** (listing, buyer, seller, offers, bond) | `GET /api/transactions/:id` with listing, buyer, seller, bond. No “offers” array. | ⚠️ PARTIAL |
| **POST /transactions/:id/offers** (price, message, quantity; expiry) | Counter via `PUT /api/transactions/:id/counter`. No separate offers table or expiry. | ⚠️ PARTIAL |
| **PATCH accept/reject offer** | `PUT /api/transactions/:id/accept`, `PUT /api/transactions/:id/reject`. | ✅ PASS |
| **finalizeTransaction** — commission, bond, collection job | `PUT /api/transactions/:id/finalize` updates status and creates bond/collection; commission logic not verified. | ⚠️ PARTIAL |
| **PATCH /transactions/:id/cancel** | Not found. | ❌ GAP |
| **POST /transactions/:id/dispute** | Not found. | ❌ GAP |
| **GET /transactions/:id/bond** | `GET /api/transactions/:id/bond`. | ✅ PASS |
| **Schema:** Transaction uses amountPaisa only | Schema **updated**: added offeredPricePaisa, counterPricePaisa, finalPricePaisa, totalPaisa, message, unitId; added enum values OFFERED, NEGOTIATING, ACCEPTED, REJECTED. POST /transactions now sets sellerId and amountPaisa. | ✅ FIXED |

**Note:** Run `npx prisma migrate dev` (or `db push`) and `prisma generate` after pulling the schema change.

---

## 6. WALLET & PAYMENTS FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **wallet_ledger** (credit/debit rows, balance_after, reference_type) | Wallet model has balancePaisa only. No ledger table. | ❌ GAP |
| **GET /wallet** — balance, recentLedger | Not under /wallet. `GET /api/payments/history`, dealers balance via admin/dealers. | ⚠️ PARTIAL |
| **GET /wallet/ledger** (paginated) | Not found. | ❌ GAP |
| **POST /wallet/recharge** (amountPaisa, gateway) | `POST /api/payments/jazzcash/initiate`, easypaisa, wallet/topup. | ✅ PASS (path differs) |
| **POST /payments/webhook/:gateway** (HMAC, idempotent) | Not found in routes. | ❌ GAP |
| **POST /wallet/withdraw** | Not found. | ❌ GAP |
| **GET /wallet/withdrawals** | Not found. | ❌ GAP |
| Admin: wallet summary, ledger, adjust, withdrawals approve/reject | Dealers: `POST /api/admin/dealers/:userId/balance/add|deduct`. No withdrawal_requests flow. | ⚠️ PARTIAL |

---

## 7. COLLECTIONS FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **collection_jobs** (status flow, sla_deadline, proof_photo, actual_weight) | Collection model exists with status, deadlineAt, photoUrls, confirmedWeightKg. | ✅ PASS (model) |
| **GET /collections** (dealer’s jobs, status filter) | `GET /api/collections` with filters. | ✅ PASS |
| **GET /collections/:id** | `GET /api/collections/:id`. | ✅ PASS |
| **PATCH accept / reject** (reassign on reject) | `PATCH /api/collections/:id` for status; reject triggers reassign/escalation. | ✅ PASS |
| **PATCH status** (en_route → arrived → collected → delivered) | Implemented with status flow. | ✅ PASS |
| **PATCH proof** (upload); **PATCH weight** (discrepancy flag) | Proof upload and weight endpoints exist. | ✅ PASS |
| **createCollectionJob** on finalize (territory, SLA) | Collection created on finalize; escalation service. | ✅ PASS |
| Admin: assign dealer | Exists (admin collections). | ✅ PASS |

---

## 8. KYC FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **kyc_submissions** (cnic_encrypted, 6 docs); CNIC format validation | Multi-step KYC (cnic, sim, selfie, warehouse, criminal-check, submit). CNIC stored; encryption not verified. | ⚠️ PARTIAL |
| **POST /kyc/submit** (multipart, all 6 files) | Step-by-step uploads; final submit. Not single multipart with all 6. | ⚠️ PARTIAL |
| **GET /kyc/status** | `GET /api/kyc/status`. | ✅ PASS |
| Admin: queue, get with decrypted CNIC, approve/reject + push | `GET /api/kyc/admin/pending`, `GET /api/kyc/admin/:userId`, approve/reject with notifications. | ✅ PASS |

---

## 9. TERRITORIES FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **GET /territories** (public) | `GET /api/territories` (auth). GeoZones + DealerTerritory. | ✅ PASS |
| **GET /territories/mine** | `GET /api/territories/my`. | ✅ PASS |
| Admin: CRUD territories, assign dealers | POST/PUT/DELETE territories; assign dealers. | ✅ PASS |

---

## 10. RATINGS FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **ratings** table (transaction_id, rater_id, ratee_id, stars, comment) | DealerRating exists (dealer-focused, collection-based). No transaction-based ratings. | ❌ GAP |
| **POST /ratings** (transactionId, stars, comment) | Not found. | ❌ GAP |
| **GET /users/:id/ratings** and **rating-summary** | Not found. | ❌ GAP |

---

## 11. SUBSCRIPTIONS FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **GET /subscriptions/plans** | `GET /api/subscriptions/plans`. | ✅ PASS |
| **GET /subscriptions/mine** | `GET /api/subscriptions/my`. | ✅ PASS |
| **POST /subscriptions/purchase** (planId; debit or free) | `POST /api/subscriptions/subscribe`. | ✅ PASS |
| Admin: plans CRUD, assign | `POST /api/subscriptions/plans` (admin). | ✅ PASS |

---

## 12. NOTIFICATIONS FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **GET /notifications** (page, limit) | `GET /api/notifications` with unreadOnly, returns unreadCount. | ✅ PASS |
| **GET /notifications/unread-count** | Returned inside GET /notifications (unreadCount). No dedicated endpoint. | ⚠️ PARTIAL |
| **PATCH /:id/read** and **read-all** | `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`. | ✅ PASS |
| **POST /admin/notifications/broadcast** | Not found. | ❌ GAP |

---

## 13. ANALYTICS FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **GET /analytics/dealer** (requireSubscription advanced_analytics) | `GET /api/analytics/overview`, listings-by-category, by-zone. No dealer-specific or subscription gate. | ⚠️ PARTIAL |
| **GET /admin/analytics** (KPIs, top dealers, monthly GMV, etc.) | Dashboard and analytics routes exist; full spec KPIs not verified. | ⚠️ PARTIAL |

---

## 14. ADMIN PORTAL FLOW

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| Admin login (email + password) | No dedicated admin-login; uses same login. | ⚠️ PARTIAL |
| **GET /admin/settings**, **PATCH /admin/settings** | `GET/PUT /api/admin/platform-config`. Naming differs. | ✅ PASS |
| **GET /admin/audit-log** (paginated, export CSV) | `GET /api/admin/audit-logs`. Export not verified. | ⚠️ PARTIAL |
| Disputes list + resolve | No disputes routes. | ❌ GAP |
| Withdrawals list + approve/reject | No withdrawal_requests flow. | ❌ GAP |

---

## 15. CROSS-CUTTING

| Spec requirement | Current implementation | Status |
|------------------|------------------------|--------|
| **Response envelope** success / paginated / error | `apiResponse.js` exists; not applied to all routes. | ⚠️ PARTIAL |
| **GET /health** (status, uptime, db) | Implemented. | ✅ PASS |
| **Protected routes** (verifyToken except auth, webhook, config, public GETs) | Auth middleware on most routes; config and health public. | ✅ PASS |
| **hpp()** middleware | Not found. | ❌ GAP |
| **Zod** validation | express-validator used; no Zod. | ⚠️ PARTIAL |
| **Cron:** listing expiry, offer expiry, collection SLA, subscription expiry | Escalation crons (listing, collection). Offer/subscription expiry not verified. | ⚠️ PARTIAL |

---

## CRITICAL FIXES (P0)

1. **Transaction schema/code mismatch** — **FIXED.**  
   Prisma `Transaction` now includes `offeredPricePaisa`, `counterPricePaisa`, `finalPricePaisa`, `totalPaisa`, `message`, `unitId`, and status values OFFERED, NEGOTIATING, ACCEPTED, REJECTED. Create payload sets `sellerId` and `amountPaisa`. Run migrations after pull.

2. **Mobile baseUrl /v1**  
   Under `/v1` only: auth, listings, categories, units, geo-zones, notifications, territories, collections, kyc, config. There is no `/v1/users` or `/v1/transactions` or `/v1/chat`. If the app uses baseUrl `.../v1`, then profile must come from `/v1/auth/me` (auth is under v1) and transactions/chat need to be mounted under v1 or mobile must use a different base for those.

---

## RECOMMENDED NEXT STEPS

1. Fix Transaction model and routes (add missing fields or refactor to amountPaisa-only).
2. Add **GET /listings/my** (and mount under `/v1` if mobile uses v1 for listings).
3. Add **POST /auth/admin-login** and use it for web-admin.
4. Add **GET /notifications/unread-count** (or document that unreadCount in GET /notifications is sufficient).
5. Add **PATCH /listings/:id/deactivate** and **reactivate** (or document that PUT status covers it).
6. Add **PATCH /users/me/notification-preferences** and **POST /users/me/fcm-token** (or equivalent under auth).
7. Introduce **wallet_ledger** and **withdrawal_requests** (and admin approve/reject) for full wallet flow.
8. Add **disputes** (model + admin resolve) if required by product.
9. Add **rate limiters** (global, auth, OTP) per spec.
10. Optionally align chat to **room-based** model (chat_rooms + listing_id) and add media upload and blocked-user check.

---

*Validation date: March 2026. Re-run after schema or route changes.*
