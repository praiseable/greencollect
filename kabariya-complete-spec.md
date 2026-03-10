# KABARIYA — Complete System Build Specification
## CursorAI Agentic Mode Prompt

> **HOW TO USE:** Open your monorepo in Cursor → press `CMD+SHIFT+P` → select **"Cursor: Open Composer (Agentic)"** → paste this entire file → press Enter. Cursor will scaffold, write, and wire every file listed below without further prompting.

---

## ARCHITECTURE OVERVIEW

```
kabariya/
├── backend/          ← Single Node.js/Express API — shared by ALL clients
├── mobile/           ← React Native (Expo or bare) — two app targets
│   ├── apps/
│   │   ├── kabariya/         ← Customer app
│   │   └── kabariya-pro/     ← Dealer/franchise app
│   └── src/                  ← Shared components, services, screens
└── portal/           ← Next.js 14 Admin Portal (web) — consumes same backend API
```

**Key constraint respected throughout:** The Express backend exposes one API (`/api/v1/`). Mobile apps and the admin portal both authenticate against it. Admin routes are protected by `requireRole('admin')` middleware — there is NO separate backend for the portal.

---

## SYSTEM ACTORS

| Actor | App | Role value in DB |
|---|---|---|
| Customer | Kabariya mobile | `customer` |
| Local Dealer | Kabariya Pro | `local_dealer` |
| City Franchise | Kabariya Pro | `city_franchise` |
| Wholesale | Kabariya Pro | `wholesale` |
| Admin | Portal (web) | `admin` |
| Super Admin | Portal (web) | `super_admin` |

---

## TECH STACK — LOCKED CHOICES

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4
- **Database:** PostgreSQL 15 via **Knex.js** (query builder + migrations)
- **Cache / Rate-limit store:** Redis 7 via **ioredis**
- **Real-time:** Socket.io 4
- **Auth:** JWT (jsonwebtoken) — access token 15 min, refresh token 30 days
- **File storage:** AWS S3 via multer-s3
- **Push notifications:** Firebase Admin SDK (FCM)
- **SMS fallback:** Twilio
- **PDF generation:** PDFKit
- **Job queue:** BullMQ + Redis
- **Scheduler:** node-cron
- **Validation:** Zod
- **Password hashing:** bcryptjs (saltRounds=12)
- **Encryption:** Node.js built-in `crypto` AES-256-GCM
- **Security:** helmet, cors, express-rate-limit, hpp

### Mobile
- **Framework:** React Native 0.73 (bare workflow)
- **Navigation:** React Navigation 6
- **State:** Zustand
- **API client:** Axios with interceptors
- **Secure storage:** react-native-keychain
- **Push:** @react-native-firebase/messaging
- **Real-time:** socket.io-client
- **Images:** react-native-fast-image
- **Charts:** react-native-chart-kit
- **PDF view:** react-native-pdf
- **Camera:** react-native-image-picker
- **Crash reporting:** @react-native-firebase/crashlytics
- **Network:** @react-native-community/netinfo
- **i18n:** react-i18next

### Admin Portal
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Data fetching:** TanStack Query v5
- **Tables:** TanStack Table v8
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **HTTP:** Axios
- **Auth:** JWT stored in httpOnly cookie via `next/headers`

---

## PART 1 — DATABASE SCHEMA (PostgreSQL via Knex migrations)

> Create all migrations in `backend/migrations/`. Run `npx knex migrate:latest` and `npx knex seed:run`.

### 1.1 users
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
name            varchar(200) NOT NULL
phone           varchar(20) NOT NULL UNIQUE
email           varchar(200) UNIQUE
password_hash   varchar(255)              -- nullable for OTP-only users
role            varchar(30) NOT NULL      -- customer|local_dealer|city_franchise|wholesale|admin|super_admin
city            varchar(100)
fcm_token       varchar(500)
platform        varchar(10)               -- android|ios
kyc_status      varchar(20) DEFAULT 'not_required'  -- not_required|pending|approved|rejected
wallet_balance  bigint DEFAULT 0          -- PKR paisa (integer only, NO floats)
avg_rating      decimal(3,2) DEFAULT 0
rating_count    int DEFAULT 0
notification_preferences  jsonb DEFAULT '{}'
status          varchar(20) DEFAULT 'active'  -- active|suspended|banned
suspension_reason text
deleted_at      timestamp
created_at      timestamp DEFAULT now()
updated_at      timestamp DEFAULT now()
```

### 1.2 refresh_tokens
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
token_hash  varchar(255) NOT NULL
expires_at  timestamp NOT NULL
revoked     boolean DEFAULT false
created_at  timestamp DEFAULT now()
```

### 1.3 otp_codes
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
phone       varchar(20) NOT NULL
code        varchar(6) NOT NULL
expires_at  timestamp NOT NULL
used        boolean DEFAULT false
attempts    int DEFAULT 0
created_at  timestamp DEFAULT now()
INDEX(phone, used, expires_at)
```

### 1.4 app_versions
```sql
platform        varchar(10) PRIMARY KEY   -- android|ios
min_version     varchar(20) NOT NULL
latest_version  varchar(20) NOT NULL
force_update    boolean DEFAULT false
updated_at      timestamp DEFAULT now()
```

### 1.5 categories
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        varchar(100) NOT NULL
name_ur     varchar(100)              -- Urdu translation
icon_url    varchar(500)
sort_order  int DEFAULT 0
is_active   boolean DEFAULT true
parent_id   uuid REFERENCES categories(id)  -- null = top-level
created_at  timestamp DEFAULT now()
```

### 1.6 listings
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES users(id)
category_id     uuid NOT NULL REFERENCES categories(id)
subcategory_id  uuid REFERENCES categories(id)
title           varchar(300) NOT NULL
title_ur        varchar(300)
description     text
description_ur  text
quantity        decimal(12,2) NOT NULL
unit            varchar(20) NOT NULL      -- kg|ton|liter|piece|bundle
price           bigint NOT NULL           -- paisa per unit
is_negotiable   boolean DEFAULT true
contact_phone   varchar(20)
address         text
city            varchar(100) NOT NULL
area            varchar(100)
status          varchar(20) DEFAULT 'active'  -- draft|active|sold|expired|deactivated|deleted
is_flagged      boolean DEFAULT false
flag_count      int DEFAULT 0
view_count      int DEFAULT 0
photo_urls      jsonb DEFAULT '[]'        -- array of S3 URLs
deleted_at      timestamp
expires_at      timestamp
created_at      timestamp DEFAULT now()
updated_at      timestamp DEFAULT now()
INDEX(user_id), INDEX(status, deleted_at), INDEX(city, area), INDEX(category_id)
```

### 1.7 listing_reports
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
listing_id  uuid NOT NULL REFERENCES listings(id)
reporter_id uuid NOT NULL REFERENCES users(id)
reason      varchar(500) NOT NULL
status      varchar(20) DEFAULT 'pending'  -- pending|reviewed|dismissed
created_at  timestamp DEFAULT now()
UNIQUE(listing_id, reporter_id)
```

### 1.8 listing_favorites
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid NOT NULL REFERENCES users(id)
listing_id  uuid NOT NULL REFERENCES listings(id)
created_at  timestamp DEFAULT now()
UNIQUE(user_id, listing_id)
```

### 1.9 chat_rooms
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
listing_id      uuid REFERENCES listings(id)
participant_1   uuid NOT NULL REFERENCES users(id)
participant_2   uuid NOT NULL REFERENCES users(id)
last_message_at timestamp
created_at      timestamp DEFAULT now()
UNIQUE(participant_1, participant_2, listing_id)
```

### 1.10 chat_messages
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
room_id      uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE
sender_id    uuid NOT NULL REFERENCES users(id)
content      text
media_url    varchar(500)
type         varchar(10) DEFAULT 'text'    -- text|image
delivered_at timestamp
read_at      timestamp
created_at   timestamp DEFAULT now()
INDEX(room_id, created_at)
```

### 1.11 blocked_users
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
blocker_id  uuid NOT NULL REFERENCES users(id)
blocked_id  uuid NOT NULL REFERENCES users(id)
created_at  timestamp DEFAULT now()
UNIQUE(blocker_id, blocked_id)
```

### 1.12 transactions
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
listing_id      uuid NOT NULL REFERENCES listings(id)
buyer_id        uuid NOT NULL REFERENCES users(id)
seller_id       uuid NOT NULL REFERENCES users(id)
status          varchar(30) DEFAULT 'pending'
  -- pending|negotiating|finalized|completed|disputed|cancelled
agreed_price    bigint                    -- paisa, set on finalization
agreed_quantity decimal(12,2)
cancellation_reason text
cancelled_by    uuid REFERENCES users(id)
finalized_at    timestamp
completed_at    timestamp
created_at      timestamp DEFAULT now()
updated_at      timestamp DEFAULT now()
INDEX(buyer_id), INDEX(seller_id), INDEX(status, created_at)
```

### 1.13 offers
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE
sender_id       uuid NOT NULL REFERENCES users(id)
price           bigint NOT NULL           -- paisa
quantity        decimal(12,2)
message         text
status          varchar(20) DEFAULT 'pending'  -- pending|accepted|rejected|expired|countered
expires_at      timestamp NOT NULL
created_at      timestamp DEFAULT now()
INDEX(transaction_id, created_at)
```

### 1.14 bonds
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid NOT NULL UNIQUE REFERENCES transactions(id)
pdf_url         varchar(500) NOT NULL
generated_at    timestamp DEFAULT now()
```

### 1.15 disputes
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid NOT NULL REFERENCES transactions(id)
raised_by       uuid NOT NULL REFERENCES users(id)
reason          text NOT NULL
status          varchar(20) DEFAULT 'open'  -- open|resolved
resolution_type varchar(30)               -- award_buyer|award_seller|mutual_cancellation
resolution_note text
resolved_by     uuid REFERENCES users(id)
resolved_at     timestamp
created_at      timestamp DEFAULT now()
```

### 1.16 wallet_ledger
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id           uuid NOT NULL REFERENCES users(id)
type              varchar(10) NOT NULL     -- credit|debit
amount            bigint NOT NULL          -- paisa (always positive)
balance_after     bigint NOT NULL
reference_type    varchar(40) NOT NULL
  -- recharge|commission|withdrawal|manual_adjustment|refund|deal_payment
reference_id      uuid
note              varchar(500)
created_at        timestamp DEFAULT now()
INDEX(user_id, created_at), INDEX(reference_type, created_at)
```

### 1.17 payment_transactions
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id           uuid NOT NULL REFERENCES users(id)
gateway           varchar(30) NOT NULL     -- jazzcash|easypaisa|stripe
gateway_ref       varchar(200) UNIQUE
amount            bigint NOT NULL          -- paisa
status            varchar(20) DEFAULT 'pending'  -- pending|success|failed|refunded
gateway_response  jsonb
created_at        timestamp DEFAULT now()
updated_at        timestamp DEFAULT now()
```

### 1.18 withdrawal_requests
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES users(id)
amount          bigint NOT NULL           -- paisa
bank_name       varchar(200) NOT NULL
account_number  varchar(100) NOT NULL
account_name    varchar(200) NOT NULL
status          varchar(20) DEFAULT 'pending'  -- pending|approved|rejected
admin_note      varchar(500)
processed_by    uuid REFERENCES users(id)
processed_at    timestamp
created_at      timestamp DEFAULT now()
```

### 1.19 kyc_submissions
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id           uuid NOT NULL UNIQUE REFERENCES users(id)
cnic_encrypted    text NOT NULL            -- AES-256-GCM encrypted
cnic_front_url    varchar(500)
cnic_back_url     varchar(500)
sim_doc_url       varchar(500)
selfie_url        varchar(500)
warehouse_url     varchar(500)
police_cert_url   varchar(500)
status            varchar(20) DEFAULT 'pending'  -- pending|approved|rejected
rejection_reason  text
reviewed_by       uuid REFERENCES users(id)
reviewed_at       timestamp
submitted_at      timestamp DEFAULT now()
updated_at        timestamp DEFAULT now()
```

### 1.20 territories
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
name                varchar(200) NOT NULL
city                varchar(100) NOT NULL
areas               jsonb DEFAULT '[]'    -- ["Defence", "Gulshan", ...]
parent_territory_id uuid REFERENCES territories(id)
created_at          timestamp DEFAULT now()
```

### 1.21 user_territories
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid NOT NULL REFERENCES users(id)
territory_id  uuid NOT NULL REFERENCES territories(id)
created_at    timestamp DEFAULT now()
UNIQUE(user_id, territory_id)
```

### 1.22 collection_jobs
```sql
id                        uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id            uuid NOT NULL REFERENCES transactions(id)
assigned_to               uuid REFERENCES users(id)
status                    varchar(20) DEFAULT 'created'
  -- created|assigned|accepted|rejected|en_route|arrived|collected|delivered|cancelled|overdue
listed_weight             decimal(12,2)
actual_weight             decimal(12,2)
weight_discrepancy_flagged boolean DEFAULT false
proof_photo_url           varchar(500)
rejection_reason          text
sla_deadline              timestamp
accepted_at               timestamp
en_route_at               timestamp
arrived_at                timestamp
collected_at              timestamp
delivered_at              timestamp
created_at                timestamp DEFAULT now()
updated_at                timestamp DEFAULT now()
INDEX(assigned_to, status), INDEX(status, sla_deadline)
```

### 1.23 ratings
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
transaction_id  uuid NOT NULL REFERENCES transactions(id)
rater_id        uuid NOT NULL REFERENCES users(id)
ratee_id        uuid NOT NULL REFERENCES users(id)
stars           smallint NOT NULL CHECK(stars BETWEEN 1 AND 5)
comment         varchar(1000)
created_at      timestamp DEFAULT now()
UNIQUE(transaction_id, rater_id)
```

### 1.24 subscription_plans
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
name          varchar(100) NOT NULL
price         bigint NOT NULL             -- paisa per period
duration_days int NOT NULL
max_listings  int NOT NULL DEFAULT 5
features      jsonb DEFAULT '{}'          -- { advanced_analytics, priority_territory }
is_active     boolean DEFAULT true
sort_order    int DEFAULT 0
created_at    timestamp DEFAULT now()
```

### 1.25 user_subscriptions
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid NOT NULL REFERENCES users(id)
plan_id     uuid NOT NULL REFERENCES subscription_plans(id)
status      varchar(20) DEFAULT 'active'  -- active|expired|cancelled
starts_at   timestamp NOT NULL
expires_at  timestamp NOT NULL
payment_ref uuid REFERENCES payment_transactions(id)
created_at  timestamp DEFAULT now()
INDEX(user_id, status, expires_at)
```

### 1.26 notifications
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid NOT NULL REFERENCES users(id)
type          varchar(50) NOT NULL
  -- new_listing|new_offer|chat_message|payment|kyc_update|subscription|collection_update|dispute|system
title         varchar(200) NOT NULL
body          varchar(500) NOT NULL
related_type  varchar(50)              -- listing|transaction|collection|chat_room|dispute
related_id    uuid
is_read       boolean DEFAULT false
created_at    timestamp DEFAULT now()
INDEX(user_id, is_read, created_at)
```

### 1.27 broadcast_notifications
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
title            varchar(200) NOT NULL
body             varchar(500) NOT NULL
target_role      varchar(30)             -- null = all users
target_city      varchar(100)
sent_by          uuid NOT NULL REFERENCES users(id)
recipient_count  int DEFAULT 0
created_at       timestamp DEFAULT now()
```

### 1.28 admin_audit_log
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
admin_id        uuid NOT NULL REFERENCES users(id)
action_type     varchar(100) NOT NULL
target_type     varchar(50) NOT NULL
target_id       uuid
payload_before  jsonb
payload_after   jsonb
ip_address      varchar(45)
created_at      timestamp DEFAULT now()
INDEX(admin_id, created_at), INDEX(action_type)
```

### 1.29 system_settings
```sql
key           varchar(100) PRIMARY KEY
value         varchar(500) NOT NULL
description   varchar(500)
updated_by    uuid REFERENCES users(id)
updated_at    timestamp DEFAULT now()
```

**Seed `system_settings` with these rows:**

| key | value | description |
|---|---|---|
| `commission_rate_percent` | `5` | Platform commission % per deal |
| `otp_expiry_seconds` | `300` | OTP valid for 5 minutes |
| `otp_max_attempts` | `5` | Failed attempts before lockout |
| `otp_lockout_minutes` | `15` | Lock duration after max attempts |
| `otp_resend_cooldown_seconds` | `60` | Resend cooldown |
| `listing_expiry_days` | `30` | Auto-expire listings |
| `offer_expiry_hours` | `24` | Auto-expire pending offers |
| `collection_sla_minutes` | `60` | Time for dealer to accept before reassign |
| `collection_reassign_attempts` | `3` | Max reassignment attempts |
| `min_kyc_wallet_balance` | `50000` | Min balance after KYC (500 PKR in paisa) |
| `subscription_expiry_warn_days` | `7` | Days before expiry to send first warning |

**Seed `app_versions`:**
```
android: min_version=1.0.0, latest_version=1.0.0, force_update=false
ios:     min_version=1.0.0, latest_version=1.0.0, force_update=false
```

**Seed `subscription_plans`:**
```
Basic:      price=0,       duration=30,  max_listings=5,   features={}
Pro:        price=99900,   duration=30,  max_listings=50,  features={advanced_analytics:true}
Enterprise: price=299900,  duration=30,  max_listings=999, features={advanced_analytics:true, priority_territory:true}
```

**Seed `categories`:**
```
Metals (parent), Plastics (parent), Paper & Cardboard (parent),
Electronics (parent), Rubber (parent), Glass (parent), Textile (parent),
Chemicals (parent), Other (parent)
-- subcategories for Metals: Copper, Aluminum, Steel, Iron, Brass, Lead
-- subcategories for Plastics: PET Bottles, HDPE, PVC, Polypropylene
-- subcategories for Electronics: Computers, Mobile Phones, Cables, Batteries
```

---

## PART 2 — BACKEND (Node.js / Express)

### 2.1 Project structure

```
backend/
├── src/
│   ├── app.js                    ← Express app setup (no server.listen here)
│   ├── server.js                 ← HTTP server + Socket.io attach + listen
│   ├── config/
│   │   ├── db.js                 ← Knex instance
│   │   ├── redis.js              ← ioredis client
│   │   ├── s3.js                 ← AWS S3 client
│   │   ├── firebase.js           ← Firebase Admin SDK init
│   │   └── env.js                ← Zod-validated env schema
│   ├── middleware/
│   │   ├── auth.js               ← verifyToken, requireRole(...roles)
│   │   ├── validate.js           ← validate(zodSchema) factory
│   │   ├── requireKyc.js         ← KYC approved check (Pro users)
│   │   ├── requireSubscription.js← Active subscription check
│   │   ├── rateLimiter.js        ← Global + auth-specific limiters
│   │   ├── uploadErrorHandler.js ← Multer error handler
│   │   └── auditLog.js           ← Admin action logger
│   ├── services/
│   │   ├── tokenService.js       ← generateTokens, refreshToken, revokeToken
│   │   ├── otpService.js         ← sendOtp, verifyOtp, checkLockout
│   │   ├── uploadService.js      ← All multer-s3 instances + deleteFile
│   │   ├── notificationService.js← sendPush, sendSms, sendBroadcast
│   │   ├── walletService.js      ← creditWallet, debitWallet (atomic)
│   │   ├── paymentGateway.js     ← initiatePayment (JazzCash/Easypaisa)
│   │   ├── bondService.js        ← generateBond (PDFKit + S3 upload)
│   │   ├── collectionService.js  ← createJob, assignDealer, escalate
│   │   ├── analyticsService.js   ← dealer stats, admin KPIs
│   │   └── encryptionService.js  ← AES-256-GCM encrypt/decrypt
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── kycController.js
│   │   ├── listingController.js
│   │   ├── chatController.js
│   │   ├── notificationController.js
│   │   ├── transactionController.js
│   │   ├── offerController.js
│   │   ├── walletController.js
│   │   ├── collectionController.js
│   │   ├── territoryController.js
│   │   ├── ratingController.js
│   │   ├── subscriptionController.js
│   │   ├── analyticsController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── index.js              ← mounts all routers under /api/v1
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── kyc.js
│   │   ├── listings.js
│   │   ├── chat.js
│   │   ├── notifications.js
│   │   ├── transactions.js
│   │   ├── wallet.js
│   │   ├── collections.js
│   │   ├── territories.js
│   │   ├── ratings.js
│   │   ├── subscriptions.js
│   │   ├── analytics.js
│   │   ├── payments.js           ← Webhook endpoint
│   │   └── admin/
│   │       ├── index.js          ← mounts all admin routers
│   │       ├── users.js
│   │       ├── kyc.js
│   │       ├── listings.js
│   │       ├── transactions.js
│   │       ├── disputes.js
│   │       ├── collections.js
│   │       ├── territories.js
│   │       ├── wallet.js
│   │       ├── subscriptions.js
│   │       ├── notifications.js
│   │       ├── analytics.js
│   │       ├── settings.js
│   │       └── auditLog.js
│   ├── sockets/
│   │   └── chatSocket.js         ← Socket.io event handlers
│   ├── jobs/
│   │   ├── queue.js              ← BullMQ queue setup
│   │   ├── workers/
│   │   │   ├── notificationWorker.js
│   │   │   └── paymentWorker.js
│   │   └── cron/
│   │       ├── listingExpiryJob.js
│   │       ├── offerExpiryJob.js
│   │       ├── collectionSlaJob.js
│   │       └── subscriptionExpiryJob.js
│   └── utils/
│       ├── apiResponse.js        ← success(), error(), paginated()
│       ├── pagination.js         ← parsePaginationQuery, buildMeta
│       └── phoneFormat.js        ← normalize Pakistani phone numbers
├── migrations/                   ← All Knex migration files
├── seeds/                        ← Knex seed files
├── knexfile.js
├── .env.example
└── package.json
```

### 2.2 Environment variables (`.env.example`)

```env
# App
NODE_ENV=development
PORT=5000
FRONTEND_ORIGINS=http://localhost:3000,https://admin.kabariya.pk

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/kabariya

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=replace_with_64_char_random_string
JWT_REFRESH_SECRET=replace_with_64_char_random_string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Encryption (AES-256 requires 32 bytes = 64 hex chars)
ENCRYPTION_KEY=replace_with_64_char_hex_string

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=kabariya-uploads
CDN_BASE_URL=                       # Optional CloudFront URL

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=      # Base64-encoded service account JSON

# Twilio (SMS fallback)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=+1234567890

# Payment Gateways
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
JAZZCASH_RETURN_URL=https://api.kabariya.pk/api/v1/payments/callback/jazzcash
EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=

# Admin
ADMIN_SEED_EMAIL=admin@kabariya.pk
ADMIN_SEED_PASSWORD=ChangeMe123!
```

### 2.3 Standard API response envelope

Every response from every endpoint must use these helpers from `utils/apiResponse.js`:

```javascript
// Success
res.json(success(data))
// → { success: true, data: {...} }

// Paginated list
res.json(paginated(items, meta))
// → { success: true, data: [...], meta: { page, limit, total, totalPages, hasNext, hasPrev } }

// Error
res.status(code).json(error(message, code, errors))
// → { success: false, message: "...", code: "ERROR_CODE", errors: [{field, message}] }
```

### 2.4 Authentication & Session — Complete Specification

#### Routes (`src/routes/auth.js`)

```
POST /api/v1/auth/send-otp
  Body: { phone: string, role: string }
  - Normalize phone to 03XXXXXXXXX format
  - Check user.status — if suspended/banned return 403 immediately
  - Check otp_codes for existing valid code — if within cooldown (otp_resend_cooldown_seconds) return 429
  - Check Redis key otp_lock:<phone> — if exists return 423 with lockedUntil
  - Generate 6-digit random code, hash with bcrypt(10), store in otp_codes with expires_at = now + otp_expiry_seconds
  - In dev/test: return code in response body. In production: send via Twilio SMS
  - Return: { success: true, message: "OTP sent", expiresIn: 300, cooldownSeconds: 60 }

POST /api/v1/auth/verify-otp
  Body: { phone: string, code: string, role: string }
  - Check Redis otp_lock:<phone> — if locked return 423 { code: "OTP_LOCKED", lockedUntil }
  - Find latest valid otp_codes row for phone
  - Increment attempts; if attempts >= otp_max_attempts: set Redis otp_lock:<phone> = 1, TTL = otp_lockout_minutes * 60; return 423
  - Verify bcrypt.compare(code, stored hash) — if mismatch: return 400 { message: "Incorrect OTP", attemptsLeft: N }
  - Mark otp_codes.used = true
  - Upsert user (create if new, update role if changed)
  - Call generateTokens(userId, role)
  - Store refresh token hash in refresh_tokens
  - Return: { success: true, data: { user: { id, name, phone, role, city, kycStatus, walletBalance, notificationPreferences }, accessToken, refreshToken } }

POST /api/v1/auth/refresh
  Body: { refreshToken: string }
  - Verify JWT signature (REFRESH_SECRET)
  - Find refresh_tokens row by userId where NOT revoked AND expires_at > now
  - bcrypt.compare(incomingToken, token_hash) — if no match: 401
  - Revoke old token (UPDATE revoked=true)
  - Generate new token pair, store new refresh token
  - Return: { accessToken, refreshToken }

POST /api/v1/auth/logout
  Header: Authorization: Bearer <accessToken>
  Body: { refreshToken: string }
  - Verify access token (user identified)
  - Revoke refresh token in DB
  - Return 200 { success: true }

POST /api/v1/auth/admin-login
  Body: { email: string, password: string }
  - Find user by email where role IN (admin, super_admin)
  - bcrypt.compare(password, password_hash)
  - If fail: 401 { message: "Invalid credentials" }
  - Generate tokens
  - Return: { user, accessToken, refreshToken }
  NOTE: This endpoint is used ONLY by the portal. Rate limit: 10 attempts per 15 min per IP.

GET /api/v1/config/app-version?platform=android|ios
  - Read app_versions row for platform
  - Return: { minVersion, latestVersion, forceUpdate }
```

#### Middleware (`src/middleware/auth.js`)

```javascript
// verifyToken — attach req.user from JWT
// requireRole(...roles) — 403 if user.role not in roles
// requireKyc — for Pro users: 403 { code: 'KYC_REQUIRED' } if not approved
//   Customer role NEVER hits this middleware
// requireSubscription — 402 { code: 'SUBSCRIPTION_REQUIRED' } if no active sub
// requireBalance — 402 { code: 'INSUFFICIENT_BALANCE' } if wallet_balance = 0 (Pro only)
```

#### Rate limiters (`src/middleware/rateLimiter.js`)

```javascript
// globalLimiter: 100 req / 15 min per IP — apply to all routes
// authLimiter: 10 req / 15 min per IP — apply to /auth/* routes
// otpLimiter: 3 req / 10 min per phone number (keyed on req.body.phone, Redis store)
```

### 2.5 User Management Routes

```
GET    /api/v1/users/me                     — own profile
PATCH  /api/v1/users/me                     — update name, email, city
PATCH  /api/v1/users/me/notification-preferences  — update notif prefs
POST   /api/v1/users/me/fcm-token           — { fcmToken, platform }
GET    /api/v1/users/:id/ratings            — public ratings for a user
GET    /api/v1/users/:id/rating-summary     — { averageStars, totalCount }
POST   /api/v1/users/:id/block              — block a user
DELETE /api/v1/users/:id/block              — unblock

--- Admin routes (require role: admin|super_admin) ---
GET    /api/v1/admin/users                  — paginated list, filters: role, city, kyc_status, status, q(search)
GET    /api/v1/admin/users/:id              — full profile + stats
PATCH  /api/v1/admin/users/:id/suspend      — { reason } — sets status=suspended, logs audit
PATCH  /api/v1/admin/users/:id/unsuspend    — clears suspension
PATCH  /api/v1/admin/users/:id/ban          — permanent ban, logs audit
PATCH  /api/v1/admin/users/:id/role         — { role } — change role, logs audit
```

### 2.6 KYC Routes

```
POST  /api/v1/kyc/submit
  - multipart/form-data
  - Fields: cnic_number (text), cnic_front (file), cnic_back (file), sim_doc (file),
    selfie (file), warehouse_photo (file), police_cert (file)
  - Middleware: verifyToken, requireRole('local_dealer','city_franchise','wholesale'), uploadKycDoc (all 6 files)
  - Validate cnic_number format: /^[0-9]{5}-[0-9]{7}-[0-9]$/ OR /^\d{13}$/
  - Encrypt cnic_number before storing using encryptionService
  - Upsert kyc_submissions; if status='approved' block re-submission (409)
  - If status was 'rejected' allow re-submission (reset to 'pending')
  - Set users.kyc_status = 'pending'
  - Return: { success: true, data: { status: 'pending' } }

GET   /api/v1/kyc/status
  - Returns own kyc_submissions row (without decrypting CNIC)

--- Admin KYC routes ---
GET   /api/v1/admin/kyc                     — queue, filter: status, sort: submitted_at ASC
GET   /api/v1/admin/kyc/:userId             — full submission with DECRYPTED cnic, signed S3 URLs (5 min expiry) for all docs
PATCH /api/v1/admin/kyc/:userId/approve
  - Update kyc_submissions.status = 'approved', reviewed_by, reviewed_at
  - Update users.kyc_status = 'approved'
  - sendPush: type=kyc_update, title="KYC Approved", body="Your KYC has been approved! Add balance to start."
  - Log audit
PATCH /api/v1/admin/kyc/:userId/reject
  - Body: { reason: string (min 10 chars) }
  - Update status = 'rejected', rejection_reason, reviewed_by, reviewed_at
  - Update users.kyc_status = 'rejected'
  - sendPush: type=kyc_update, body="KYC Rejected: <reason>. Please resubmit."
  - Log audit
```

### 2.7 Listings Routes

```
GET    /api/v1/listings
  Query: q, category_id, subcategory_id, min_price, max_price,
         min_quantity, max_quantity, city, area, sort(newest|price_asc|price_desc),
         page, limit
  - Always filter: status='active' AND deleted_at IS NULL
  - For Pro users (local_dealer): join user_territories → territories, filter by city+areas
  - For city_franchise: include all child territory areas
  - For wholesale/admin: no territory filter
  - Text search on title + description (PostgreSQL full-text or ILIKE)
  - Return each listing with: seller { id, name, avg_rating, rating_count }

GET    /api/v1/listings/favorites            — own favourited listings
GET    /api/v1/listings/my                   — own listings (all statuses)
GET    /api/v1/listings/:id                  — single listing (increments view_count)
POST   /api/v1/listings                      — create (requireKyc for Pro, file upload for photos)
PATCH  /api/v1/listings/:id                  — update (owner only)
PATCH  /api/v1/listings/:id/deactivate       — owner or admin
PATCH  /api/v1/listings/:id/reactivate       — owner only
DELETE /api/v1/listings/:id                  — soft delete (owner or admin)
POST   /api/v1/listings/:id/favorite         — toggle favourite
POST   /api/v1/listings/:id/report           — { reason }

--- Admin listing routes ---
GET    /api/v1/admin/listings                — all statuses, filter: status, is_flagged, city, user_id
PATCH  /api/v1/admin/listings/:id/deactivate — admin deactivate
PATCH  /api/v1/admin/listings/:id/clear-flag — clear is_flagged
DELETE /api/v1/admin/listings/:id            — admin delete (hard or soft)
```

**Auto-flag rule:** When listing_reports count for a listing reaches 5, set `listings.is_flagged = true` and `flag_count = 5`. Fire a notification to all admin users.

**Listing expiry cron** (`cron/listingExpiryJob.js`): `0 2 * * *` — update status='expired' where status='active' AND created_at < now - listing_expiry_days AND deleted_at IS NULL. Also clear `expires_at` from listings table.

### 2.8 Chat Routes & Socket Events

```
POST /api/v1/chat/rooms                      — { listingId?, recipientId } — create or get existing
GET  /api/v1/chat/rooms                      — own rooms, each with: otherParty, lastMessage, unreadCount
GET  /api/v1/chat/rooms/:id/messages?page=1  — paginated messages (30 per page), oldest first
POST /api/v1/chat/rooms/:id/media            — upload image (uploadChatMedia), returns { mediaUrl }
```

**Socket.io events** (`sockets/chatSocket.js`):

```
Auth: verify JWT from socket.handshake.auth.token on every connection.
On connect: socket.join("user:" + userId)

Client → Server:
  join_room    { roomId }
    → socket.join(roomId)
    → mark all unread messages in room as delivered_at=now
    → emit messages_delivered to room

  send_message { roomId, content, type('text'|'image'), mediaUrl? }
    → check blocked_users — if recipient blocked sender: emit error 'BLOCKED'
    → insert chat_messages row
    → update chat_rooms.last_message_at
    → emit new_message to room roomId with full message object
    → if recipient NOT in room: enqueue push notification (BullMQ)

  mark_read    { roomId }
    → UPDATE chat_messages SET read_at=now WHERE room_id=roomId AND sender_id != userId AND read_at IS NULL
    → emit messages_read { roomId, readAt } to room

Server → Client events emitted:
  new_message      { id, roomId, senderId, content, type, mediaUrl, createdAt }
  messages_read    { roomId, readAt }
  messages_delivered { roomId, deliveredAt }
```

### 2.9 Notifications Routes

```
GET   /api/v1/notifications?page=1&limit=20
GET   /api/v1/notifications/unread-count     — { count }
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all

--- Admin ---
POST  /api/v1/admin/notifications/broadcast
  Body: { title, body, targetRole?, targetCity? }
  - Insert broadcast_notifications row
  - Query matching users (apply role/city filters)
  - Enqueue push for each user via BullMQ (batch of 500 per job)
  - Update recipient_count
```

**`notificationService.js` — `sendPush()` contract:**

```javascript
async function sendPush({ userId, title, body, type, relatedType, relatedId, data = {} }) {
  // 1. Insert notifications row unconditionally
  // 2. Get user.fcm_token and user.notification_preferences
  // 3. Check if type is enabled in preferences (default: all enabled)
  // 4. If no FCM token or preference off: skip push, return
  // 5. firebase.messaging().send({ token, notification:{title,body}, data:{type, relatedType, relatedId} })
  // 6. On FCM error UNREGISTERED: clear user.fcm_token in DB
  // 7. On any FCM failure: enqueue Twilio SMS fallback via BullMQ
}
```

**Notification triggers — every one of these must call `sendPush()`:**

| Event | Recipient | Type |
|---|---|---|
| New listing in dealer's territory | all territory dealers | `new_listing` |
| New offer / counter-offer | offer recipient | `new_offer` |
| Offer accepted | offer sender | `new_offer` |
| Chat message (recipient offline) | recipient | `chat_message` |
| KYC approved | dealer | `kyc_update` |
| KYC rejected | dealer | `kyc_update` |
| Wallet credited | user | `payment` |
| Payment failed | user | `payment` |
| Collection assigned | dealer | `collection_update` |
| Collection accepted → seller | seller | `collection_update` |
| Collection en_route → seller | seller | `collection_update` |
| Collection collected → seller | seller | `collection_update` |
| Collection delivered → seller | seller | `collection_update` |
| Dispute raised | other party + admin | `dispute` |
| Transaction cancelled | other party | `new_offer` |
| Subscription expiring 7 days | user | `subscription` |
| Subscription expiring 1 day | user | `subscription` |
| Subscription expired | user | `subscription` |
| Rating received | ratee | `system` |

### 2.10 Transactions & Negotiation Routes

```
POST  /api/v1/transactions
  Body: { listingId }
  - Verify listing exists, status='active', user is not the seller
  - Check for existing transaction between same buyer+seller on same listing (reuse if pending/negotiating)
  - Insert transactions row, status='pending'
  - Return transaction

GET   /api/v1/transactions?status=active|completed|cancelled&page=1
  - Return own transactions (buyer OR seller)

GET   /api/v1/transactions/:id
  - Full detail: listing, buyer, seller, all offers ordered by created_at, bond (if exists)

POST  /api/v1/transactions/:id/offers
  Body: { price: number (paisa), message?: string, quantity?: number }
  - Verify user is buyer or seller in this transaction
  - Verify transaction.status IN ('pending', 'negotiating')
  - If status='pending': update to 'negotiating'
  - Mark any previously pending offer from this user as 'countered'
  - Read offer_expiry_hours from system_settings
  - Insert offers row with expires_at = now + offer_expiry_hours hours
  - sendPush to other party
  - Return offer

PATCH /api/v1/transactions/:id/offers/:offerId/accept
  - Verify user is recipient of this offer (not sender)
  - Update offer.status = 'accepted'
  - Update transaction: agreed_price = offer.price, agreed_quantity = offer.quantity
  - Check if both parties have agreed → call finalizeTransaction()
    (A deal is finalized when the offer sender and receiver are both buyer and seller — i.e. one accept is enough)
  - Actually: finalization happens immediately on accept. Call finalizeTransaction().

PATCH /api/v1/transactions/:id/offers/:offerId/reject
  - Verify user is recipient
  - Update offer.status = 'rejected'
  - sendPush to offer sender

PATCH /api/v1/transactions/:id/cancel
  Body: { reason: string }
  - Only buyer or seller can cancel
  - Update status='cancelled', cancellation_reason, cancelled_by
  - sendPush to other party
  - If collection_job exists: set it to 'cancelled'

POST  /api/v1/transactions/:id/dispute
  Body: { reason: string }
  - Update transaction.status = 'disputed'
  - Insert disputes row
  - sendPush to other party
  - sendPush to all admin users

GET   /api/v1/transactions/:id/bond
  - Verify user is buyer or seller
  - Return bond.pdf_url (generate signed S3 URL if private bucket)

--- Admin routes ---
GET   /api/v1/admin/transactions?status=&page=
GET   /api/v1/admin/transactions/:id
PATCH /api/v1/admin/transactions/:id/status   — force status change { status }
GET   /api/v1/admin/disputes?status=open&page=
PATCH /api/v1/admin/disputes/:id/resolve
  Body: { resolutionType: 'award_buyer'|'award_seller'|'mutual_cancellation', note: string }
  - Update disputes row
  - Update transaction.status = 'completed' (or 'cancelled' for mutual)
  - sendPush to both parties
  - Log audit
```

**`finalizeTransaction()` — internal service function:**
```
1. Update transactions: status='finalized', finalized_at=now, agreed_price, agreed_quantity
2. Update listing.status = 'sold'
3. Read commission_rate_percent from system_settings
4. commissionAmount = Math.round(agreed_price * rate / 100) — integer paisa
5. debitWallet({ userId: sellerId, amount: commissionAmount, referenceType:'commission', referenceId:transactionId })
   If InsufficientBalanceError: block finalization with 402
6. bondService.generateBond(transactionId)
7. collectionService.createCollectionJob(transactionId)
8. sendPush to buyer: "Deal agreed! Your collection has been arranged."
9. sendPush to seller: "Deal agreed! A dealer will collect your scrap."
```

**Offer expiry cron** (`cron/offerExpiryJob.js`): `*/15 * * * *` — UPDATE offers SET status='expired' WHERE status='pending' AND expires_at < now. For each: sendPush to sender.

### 2.11 Wallet & Payment Routes

```
GET  /api/v1/wallet                          — { balance, recentLedger: last 5 entries }
GET  /api/v1/wallet/ledger?page=1&limit=20   — full paginated ledger
POST /api/v1/wallet/recharge
  Body: { amountPaisa: number (min 10000 = 100 PKR), gateway: 'jazzcash'|'easypaisa' }
  - Validate amount min/max (10000–5000000 paisa)
  - Call paymentGateway.initiatePayment()
  - Return { paymentUrl, transactionId }

POST /api/v1/payments/webhook/:gateway       — NO auth middleware (public)
  - Gateway: jazzcash | easypaisa
  - Verify HMAC signature FIRST — if invalid: log and return 400
  - Find payment_transactions by gateway_ref — if not found: return 404
  - Idempotency: if status !== 'pending' return 200 immediately
  - On success: UPDATE status='success', call creditWallet(), sendPush
  - On failure: UPDATE status='failed', sendPush

POST /api/v1/wallet/withdraw
  Body: { amountPaisa, bankName, accountNumber, accountName }
  - Validate amountPaisa <= user.wallet_balance
  - Insert withdrawal_requests row

GET  /api/v1/wallet/withdrawals              — own withdrawal request history

--- Admin wallet routes ---
GET    /api/v1/admin/wallet/summary          — { totalBalance, commissionThisMonth, pendingWithdrawals }
GET    /api/v1/admin/wallet/:userId/ledger   — dealer's full ledger
POST   /api/v1/admin/wallet/:userId/adjust
  Body: { type:'credit'|'debit', amountPaisa, note (required) }
  - Call creditWallet or debitWallet
  - Log audit
GET    /api/v1/admin/withdrawals?status=pending&page=
PATCH  /api/v1/admin/withdrawals/:id/approve
  Body: { note? }
  - Update status='approved', processed_by, processed_at
  - The actual bank transfer is manual — this just marks it approved
  - Log audit
PATCH  /api/v1/admin/withdrawals/:id/reject
  Body: { note (required) }
  - Update status='rejected'
  - sendPush to user: "Withdrawal request rejected: <note>"
  - Log audit
```

**`walletService.js` rules:**
- ALL amounts in integer paisa — validate with `Number.isInteger()`, reject floats
- All DB wallet operations in a Knex transaction (BEGIN/COMMIT)
- Never allow balance to go below 0 — throw `InsufficientBalanceError`
- `balance_after` in ledger = current balance AFTER the operation

### 2.12 Collections Routes

```
GET   /api/v1/collections?status=&page=       — dealer's own jobs
GET   /api/v1/collections/:id
PATCH /api/v1/collections/:id/accept
  - Verify assigned_to === req.user.id
  - Update status='accepted', accepted_at=now
  - sendPush to seller

PATCH /api/v1/collections/:id/reject
  Body: { reason: string }
  - Update status='rejected', rejection_reason
  - Call collectionService.reassignOrEscalate(jobId)

PATCH /api/v1/collections/:id/status
  Body: { status: 'en_route'|'arrived'|'collected'|'delivered' }
  - Enforce order: accepted→en_route→arrived→collected→delivered (no skipping)
  - If advancing to 'collected': require proof_photo_url to exist first (409 if not)
  - Set the corresponding *_at timestamp
  - sendPush to seller on each step
  - If status='delivered': call transactionController.completeTransaction()

PATCH /api/v1/collections/:id/proof           — upload proof photo (multipart), uploadCollectionProof
PATCH /api/v1/collections/:id/weight
  Body: { actualWeight: number }
  - Store actual_weight
  - If |actualWeight - listed_weight| / listed_weight > 0.1: set weight_discrepancy_flagged=true
    sendPush to admin: "Weight discrepancy on collection #<id>"

--- Admin collection routes ---
GET   /api/v1/admin/collections?status=&page=
PATCH /api/v1/admin/collections/:id/assign    — { dealerId } — manual assign
```

**`collectionService.createCollectionJob(transactionId)`:**
```
1. Read transaction → get listing.city, listing.area, listing.quantity as listed_weight
2. Read collection_sla_minutes from system_settings
3. Find eligible dealer:
   SELECT u.id FROM users u
   JOIN user_territories ut ON ut.user_id = u.id
   JOIN territories t ON t.id = ut.territory_id
   WHERE t.city = listing.city AND listing.area = ANY(t.areas::text[])
   AND u.role = 'local_dealer' AND u.kyc_status = 'approved' AND u.wallet_balance > 0
   AND u.status = 'active'
   ORDER BY u.last_job_assigned_at ASC NULLS FIRST
   LIMIT 1
4. If found: INSERT collection_jobs with status='assigned', assigned_to=dealer.id
   UPDATE users SET last_job_assigned_at=now WHERE id=dealer.id
   sendPush to dealer: "New collection job assigned. Please accept within <sla> minutes."
5. If not found: INSERT with status='created', assigned_to=null
   sendPush to all admin users: "No dealer available for collection job."
6. sla_deadline = now + sla minutes
```

**Collection SLA cron** (`cron/collectionSlaJob.js`): `*/5 * * * *`
```
Find jobs WHERE status IN ('created','assigned') AND sla_deadline < now:
  For each:
    Increment reassign_count (add column). Read collection_reassign_attempts from settings.
    If reassign_count < max: find next eligible dealer (skip current), reassign
    If reassign_count >= max OR no eligible dealers:
      Try city_franchise in parent territory
      If still none: set status='overdue', sendPush to all admin
```

### 2.13 Territory Routes

```
GET  /api/v1/territories                     — all territories (public)
GET  /api/v1/territories/mine                — dealer's assigned territories

--- Admin ---
POST   /api/v1/admin/territories             — { name, city, areas:[], parentTerritoryId? }
PATCH  /api/v1/admin/territories/:id
DELETE /api/v1/admin/territories/:id         — block if user_territories exists (409)
POST   /api/v1/admin/territories/:id/dealers — { userId } assign dealer
DELETE /api/v1/admin/territories/:id/dealers/:userId — remove dealer
GET    /api/v1/admin/territories/:id/dealers — list dealers assigned to this territory
```

### 2.14 Ratings Routes

```
POST /api/v1/ratings
  Body: { transactionId, stars (1-5), comment? }
  - Verify transaction.status = 'completed'
  - Verify req.user.id is buyer or seller
  - Determine ratee_id = the other party
  - UNIQUE check: one rating per (transaction_id, rater_id)
  - INSERT ratings row
  - UPDATE users SET avg_rating = (sum of stars / count), rating_count = count WHERE id = ratee_id
    (Compute with: SELECT AVG(stars), COUNT(*) FROM ratings WHERE ratee_id = ?)
  - sendPush to ratee

GET /api/v1/users/:id/ratings?page=1
GET /api/v1/users/:id/rating-summary          — { averageStars, totalCount, distribution:{1:..,5:..} }
```

### 2.15 Subscription Routes

```
GET  /api/v1/subscriptions/plans              — active plans ordered by sort_order
GET  /api/v1/subscriptions/mine               — current active subscription or null
POST /api/v1/subscriptions/purchase
  Body: { planId }
  - Find plan, verify is_active
  - If plan.price = 0: create subscription directly, starts_at=now, expires_at=now+duration_days
  - If plan.price > 0: debitWallet({ amount: plan.price, referenceType:'subscription' })
    If insufficient: 402
    Create user_subscriptions row
  - Cancel any existing active subscription (set status='cancelled')
  - sendPush: "Subscription activated!"

--- Admin ---
GET    /api/v1/admin/subscriptions            — all active subscriptions
POST   /api/v1/admin/subscriptions/plans      — create plan
PATCH  /api/v1/admin/subscriptions/plans/:id  — edit plan
POST   /api/v1/admin/subscriptions/assign
  Body: { userId, planId, daysOverride? }
  - Create/override subscription for user ignoring payment
  - Log audit
```

**Subscription expiry cron** (`cron/subscriptionExpiryJob.js`): `0 6 * * *`
```
1. Find subscriptions WHERE expires_at = today+7 days AND status='active': sendPush "expires in 7 days"
2. Find subscriptions WHERE expires_at = today+1 day AND status='active': sendPush "expires tomorrow"
3. Find subscriptions WHERE expires_at < now AND status='active':
   UPDATE status='expired'
   sendPush "Your subscription has expired. Renew to continue."
```

### 2.16 Analytics Routes

```
GET /api/v1/analytics/dealer
  - requireSubscription with feature: advanced_analytics
  - Return:
    totalListings, activeListings, totalDeals (completed transactions),
    totalRevenue (sum of agreed_price for completed transactions as seller),
    commissionPaid (sum of commission debits from wallet_ledger),
    zoneRank: { rank, total } — rank this dealer by deal count among dealers in same territories,
    monthlyBreakdown: last 12 months [ { month:'2026-01', dealCount, revenue } ],
    avgRating, totalRatings

GET /api/v1/admin/analytics
  - requireRole('admin','super_admin')
  - Return:
    userCounts: { total, byRole: { customer, local_dealer, city_franchise, wholesale } },
    newUsersThisMonth,
    activeListings, listingsThisMonth,
    totalDeals, dealsThisMonth,
    gmvThisMonth, gmvTotal,
    commissionThisMonth, commissionTotal,
    topDealers: [ { name, phone, city, dealCount, revenue } ] top 5,
    topCategories: [ { name, listingCount } ] top 5,
    monthlyGmv: [ { month, gmv, deals } ] last 12 months,
    pendingKyc, openDisputes, pendingWithdrawals, overdueCollections,
    recentActivity: last 10 events (new users, deals, disputes)
```

### 2.17 Admin System Settings Routes

```
GET   /api/v1/admin/settings           — all system_settings rows
PATCH /api/v1/admin/settings           — body: { key: value, ... } — bulk update
  - For each key: UPDATE system_settings, UPDATE updated_by=admin, updated_at=now
  - Log audit for each changed key with payload_before/payload_after
  - Reload settings cache (store in Redis with key 'system_settings', invalidate on update)

GET   /api/v1/admin/audit-log?adminId=&actionType=&from=&to=&page=
  - Paginated audit log
  - Export: GET /api/v1/admin/audit-log/export?format=csv — stream CSV response

POST  /api/v1/admin/notifications/broadcast   — see 2.9
```

### 2.18 BullMQ Jobs

Create queues in `jobs/queue.js`:
- `notificationQueue` — push notifications + SMS fallback
- `paymentQueue` — webhook processing (idempotent)

Workers in `jobs/workers/`:
- `notificationWorker.js` — processes `sendPush` jobs, max concurrency 10
- `paymentWorker.js` — processes payment confirmations, max concurrency 3

Cron jobs registered in `server.js` on startup:
- listingExpiryJob, offerExpiryJob, collectionSlaJob, subscriptionExpiryJob

### 2.19 File Upload Service (`services/uploadService.js`)

```javascript
// Multer instances — all use multer-s3 uploading directly to S3

uploadListingPhotos   — fieldName='photos', maxCount=5, images only (jpeg/png/webp), max 5MB each
uploadKycDoc          — single file, fieldName varies per call, images + pdf, max 10MB
uploadCollectionProof — single file, fieldName='proof', images only, max 5MB
uploadChatMedia       — single file, fieldName='media', images only, max 5MB
uploadAvatar          — single file, fieldName='avatar', images only, max 2MB

// S3 key pattern: uploads/<folder>/<userId>/<timestamp>-<sanitizedFilename>
// folders: listings | kyc | collections | chat | avatars

// If CDN_BASE_URL is set, replace s3.amazonaws.com/<bucket>/ with CDN_BASE_URL/

// deleteS3File(url): extract key from URL, call s3.deleteObject()
// getSignedUrl(url, expiresSeconds=300): generate presigned GET URL
```

### 2.20 Bond Generation (`services/bondService.js`)

```javascript
async function generateBond(transactionId) {
  // 1. Fetch: transaction JOIN listing JOIN buyer(user) JOIN seller(user) JOIN accepted offer
  // 2. Create PDF with PDFKit:
  //    - A4 page, margins 50px
  //    - Header: "KABARIYA" bold 24pt blue, right-aligned date
  //    - Horizontal rule
  //    - Title: "DEAL AGREEMENT" centered 18pt
  //    - Two-column section: Seller info | Buyer info (name, phone, city)
  //    - Deal details table: Listing Title, Category, Agreed Price (PKR), Quantity, Unit
  //    - Transaction ID in small monospace at bottom
  //    - Footer: "This agreement is electronically generated by Kabariya platform."
  // 3. Stream PDF to buffer
  // 4. Upload buffer to S3: uploads/bonds/<transactionId>.pdf
  // 5. INSERT bonds row
  // 6. Return pdf_url
}
```

---

## PART 3 — REACT NATIVE MOBILE APPS

### 3.1 Monorepo structure

```
mobile/
├── apps/
│   ├── kabariya/                  ← Customer app
│   │   ├── android/
│   │   ├── ios/
│   │   └── index.js               ← registers 'kabariya' app name
│   └── kabariya-pro/              ← Dealer/franchise app
│       ├── android/
│       ├── ios/
│       └── index.js               ← registers 'kabariyaPro' app name
└── src/                           ← Shared code for both apps
    ├── config/
    │   ├── api.js                 ← Axios instance with interceptors
    │   ├── constants.js           ← app-specific flags injected at build time
    │   └── i18n.js                ← react-i18next setup, en.json + ur.json
    ├── stores/
    │   ├── authStore.js           ← Zustand: user, tokens, login/logout
    │   ├── notificationStore.js   ← Zustand: unread count
    │   └── settingsStore.js       ← Zustand: language, notif prefs
    ├── services/
    │   ├── authStorage.js         ← react-native-keychain wrapper
    │   ├── socketService.js       ← Socket.io client singleton
    │   └── pushService.js         ← FCM setup, token register
    ├── navigation/
    │   ├── RootNavigator.js       ← auth check → splash → onboarding → main
    │   ├── AuthNavigator.js       ← Login, OTP, Register
    │   ├── MainNavigator.js       ← Bottom tabs
    │   ├── HomeStack.js
    │   ├── ListingStack.js
    │   ├── ProfileStack.js
    │   └── NotificationNavigator.js ← deep-link routing on push tap
    ├── screens/
    │   ├── SplashScreen.js
    │   ├── OnboardingScreen.js
    │   ├── LoginScreen.js
    │   ├── OTPScreen.js
    │   ├── RegisterScreen.js
    │   ├── HomeScreen.js
    │   ├── ListingsScreen.js
    │   ├── ListingDetailScreen.js
    │   ├── CreateListingScreen.js  ← 5-step wizard
    │   ├── EditListingScreen.js
    │   ├── ChatInboxScreen.js
    │   ├── ChatScreen.js
    │   ├── NotificationsScreen.js
    │   ├── ProfileScreen.js
    │   ├── EditProfileScreen.js
    │   ├── TransactionsScreen.js
    │   ├── TransactionDetailScreen.js
    │   ├── NegotiationScreen.js
    │   ├── BondViewerScreen.js
    │   ├── SettingsScreen.js
    │   ├── SubscriptionScreen.js
    │   ├── FavoritesScreen.js
    │   ├── ForceUpdateScreen.js
    │   └── pro/                   ← Pro-only screens (not rendered in Kabariya app)
    │       ├── KYCStep1Screen.js  ← CNIC
    │       ├── KYCStep2Screen.js  ← SIM
    │       ├── KYCStep3Screen.js  ← Selfie
    │       ├── KYCStep4Screen.js  ← Warehouse
    │       ├── KYCStep5Screen.js  ← Police cert
    │       ├── KYCStep6Screen.js  ← Review + submit
    │       ├── KYCStatusScreen.js
    │       ├── BalanceGateScreen.js
    │       ├── WalletScreen.js
    │       ├── RechargeScreen.js
    │       ├── WithdrawScreen.js
    │       ├── CollectionsScreen.js
    │       ├── CollectionDetailScreen.js
    │       ├── TerritoryScreen.js
    │       ├── MyRatingScreen.js
    │       └── AnalyticsScreen.js
    ├── components/
    │   ├── ListingCard.js
    │   ├── FilterPanel.js         ← bottom sheet
    │   ├── OptimizedImage.js      ← FastImage wrapper with shimmer
    │   ├── SkeletonLoader.js
    │   ├── ErrorBoundary.js
    │   ├── NetworkBanner.js       ← offline banner
    │   ├── StarRating.js
    │   ├── StatusBadge.js
    │   └── EmptyState.js
    └── hooks/
        ├── useNetworkStatus.js
        ├── usePagination.js
        └── useDebounce.js
```

### 3.2 App startup flow (RootNavigator.js)

```
1. Show SplashScreen (1.5s minimum)
2. Call GET /config/app-version — compare with current app version
   If forceUpdate: render ForceUpdateScreen (non-dismissible), stop here
3. Read tokens from Keychain
   If no tokens: navigate to OnboardingScreen (first launch) or LoginScreen (returning)
4. Call POST /auth/refresh — if fails: navigate to LoginScreen
5. Call GET /users/me — populate authStore
6. PRO APP ONLY:
   If user.kyc_status !== 'approved': navigate to KYC flow based on kycStatus
   If user.kyc_status === 'approved' AND user.wallet_balance = 0: navigate to BalanceGateScreen
7. Navigate to MainNavigator (bottom tabs)
8. Register FCM token: pushService.init()
9. Connect socket: socketService.connect()
```

### 3.3 Axios API client (`services/api.js`)

```javascript
// Base URL from env: REACT_APP_API_URL or build-time constant
// Request interceptor: add Authorization: Bearer <accessToken> from Keychain
// Response interceptor:
//   On 401: attempt token refresh via POST /auth/refresh
//           On success: retry original request
//           On failure: authStore.logout() → navigate to Login
// All network errors: throw { userMessage: 'No internet connection' } if no network
// All 5xx errors: throw { userMessage: 'Server error. Please try again.' }
```

### 3.4 Key screen specifications

#### LoginScreen.js
- Phone input (Pakistan format: 03XXXXXXXXX, max 11 digits)
- Role picker: Customer / (Pro only: Local Dealer / City Franchise / Wholesale)
- "Send OTP" button → POST /auth/send-otp
- Navigate to OTPScreen with phone + role passed as params

#### OTPScreen.js
- 6-box OTP input (auto-advance, auto-submit on 6th digit)
- "Resend OTP" button with 60s countdown (disabled during countdown)
- Per-attempt error: "Incorrect code (N/5 attempts)"
- On 423 response: "Account locked. Try again at <lockedUntil time>"
- On success: store tokens in Keychain, update authStore, navigate per startup flow

#### HomeScreen.js
- "Hello, <name>" header with bell icon + unread badge
- "Post a Listing" primary CTA button
- Horizontal category scroll (icons + name from GET /categories)
- "Recent Listings" section (last 10 from GET /listings?sort=newest&limit=10)
- Pull-to-refresh

#### ListingsScreen.js
- Search bar (debounced 500ms → GET /listings?q=)
- Filter button with active-filter count badge
- FilterPanel (bottom sheet):
  - Category / Subcategory pickers
  - Price range (two sliders or text inputs)
  - City text input
  - Sort radio: Newest / Price Low-High / Price High-Low
  - "Apply" and "Clear Filters" buttons
- FlatList with `getItemLayout` (row height 120), `initialNumToRender=10`
- `onEndReached`: load next page (append to list, do not replace)
- Each ListingCard: OptimizedImage, title, price, quantity+unit, city, time ago, seller rating stars

#### CreateListingScreen.js (5-step wizard)
```
Step 1: Category (picker) + Subcategory (picker, filtered by category)
Step 2: Photos — react-native-image-picker, grid of up to 5, remove/add, skip allowed
Step 3: Title*, Description, Quantity*, Unit picker*, Price (PKR)*, Negotiable toggle, Contact phone, Address
Step 4: City*, Area text input
Step 5: Preview of all data — "Edit" links per section, "Submit" button
         On submit: multipart POST /listings, on success navigate to listing detail
```
All steps show progress indicator (Step X of 5). Back navigation between steps preserves form state.

#### NegotiationScreen.js
- Timeline of all offers: each item shows role badge (Buyer/Seller), price formatted as PKR X,XXX, message, time, status badge
- If status = 'pending' and user is the recipient: show Accept / Reject buttons inline
- Bottom form: Price (PKR) input + Message input + "Send Offer" button
- Status cannot be 'finalized' or later: show "Deal Finalized" banner instead of form
- "Cancel Deal" button (red) → confirmation modal → reason input → PATCH /transactions/:id/cancel
- "Open Dispute" button appears when status = 'finalized' or 'completed'
- "View Bond" button appears when status = 'finalized' | 'completed' | 'disputed'
- "Mark as Completed" (seller only, when status = 'finalized')

#### WalletScreen.js (Pro)
- Balance: large PKR display, formatted as "PKR 1,250.00"
- "Add Money" button (navigates to RechargeScreen)
- "Withdraw" button (navigates to WithdrawScreen)
- Ledger FlatList: type icon (↑ green credit / ↓ red debit), description, amount, balance after, date

#### CollectionsScreen.js (Pro)
- 4 tabs: Active, In Progress, Completed, Overdue
- Each card: seller address, listing title, assigned time, SLA countdown (minutes left), status badge
- Overdue jobs: red background card

#### CollectionDetailScreen.js (Pro)
- Seller info: name, address, tap-to-call phone
- Listing: title, quantity, unit, photo
- Status history timeline: each step with timestamp
- Status update button (next allowed status only)
- At 'collected': "Upload Proof Photo" required (disabled until uploaded)
- Actual weight input at 'collected' step — warning if discrepancy > 10%

#### AnalyticsScreen.js (Pro)
- Requires active Pro or Enterprise subscription — show upgrade prompt if not
- KPI row: 4 cards (Deals, Revenue, Active Listings, Rating)
- Zone Rank card: "Ranked #N of M dealers in your zone"
- Bar chart: last 6 months deal count (react-native-chart-kit BarChart)
- Pull-to-refresh

### 3.5 i18n Setup (`config/i18n.js`)

```
Languages: en (English, LTR) and ur (Urdu, RTL)
Storage: AsyncStorage key 'app_language'
RTL switching:
  import { I18nManager } from 'react-native'
  import RNRestart from 'react-native-restart'
  When user selects Urdu: I18nManager.forceRTL(true); RNRestart.Restart()
  When user selects English: I18nManager.forceRTL(false); RNRestart.Restart()

All user-visible strings MUST be in src/locales/en.json and src/locales/ur.json.
Use t('key') from useTranslation() — never hardcode strings in JSX.
```

### 3.6 Back button (Android)

In HomeScreen (the initial tab):
```javascript
useFocusEffect(() => {
  let backPressed = false;
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (backPressed) { BackHandler.exitApp(); return true; }
    backPressed = true;
    Toast.show('Press back again to exit');
    setTimeout(() => { backPressed = false; }, 2000);
    return true;
  });
  return () => sub.remove();
});
```

Other tabs: back press → navigate to Home tab (not exit).

### 3.7 Offline handling (`components/NetworkBanner.js`)

```javascript
// useNetworkStatus() hook using NetInfo
// If !isConnected: render persistent red banner at top: "No internet connection"
// In Axios interceptor: if error.message === 'Network Error': throw readable message
// Never crash on network error — always show toast or inline message
```

### 3.8 Crash reporting

Both apps must have `@react-native-firebase/crashlytics` configured:
```javascript
// In ErrorBoundary.js:
crashlytics().recordError(error)
// After login in authStore:
crashlytics().setUserId(user.id)
crashlytics().setAttribute('role', user.role)
```

### 3.9 Push notification deep-link routing (`navigation/NotificationNavigator.js`)

```javascript
const routeMap = {
  new_listing:       (id) => navigate('ListingDetail', { id }),
  new_offer:         (id) => navigate('TransactionDetail', { id }),
  chat_message:      (id) => navigate('Chat', { roomId: id }),
  payment:           ()   => navigate('Wallet'),
  kyc_update:        ()   => navigate('KYCStatus'),
  subscription:      ()   => navigate('Subscription'),
  collection_update: (id) => navigate('CollectionDetail', { id }),
  dispute:           (id) => navigate('TransactionDetail', { id }),
};
// Handle both foreground (messaging().onMessage) and background tap (getInitialNotification / onNotificationOpenedApp)
```

---

## PART 4 — ADMIN PORTAL (Next.js 14)

### 4.1 Project structure

```
portal/
├── src/
│   ├── app/                       ← Next.js App Router pages
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx         ← sidebar + header shell
│   │       ├── page.tsx           ← /dashboard
│   │       ├── users/
│   │       │   ├── page.tsx       ← user list
│   │       │   └── [id]/page.tsx  ← user detail
│   │       ├── kyc/page.tsx
│   │       ├── listings/page.tsx
│   │       ├── transactions/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── disputes/page.tsx
│   │       ├── collections/page.tsx
│   │       ├── finance/page.tsx
│   │       ├── territories/page.tsx
│   │       ├── subscriptions/page.tsx
│   │       ├── notifications/page.tsx
│   │       ├── analytics/page.tsx
│   │       ├── settings/page.tsx
│   │       └── audit-log/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        ← nav links, role-aware visibility
│   │   │   ├── Header.tsx         ← admin name, logout
│   │   │   └── PageHeader.tsx     ← title + breadcrumb
│   │   ├── ui/                    ← shadcn/ui components
│   │   ├── tables/
│   │   │   ├── DataTable.tsx      ← reusable TanStack Table wrapper
│   │   │   └── Pagination.tsx
│   │   ├── modals/
│   │   │   ├── KYCReviewModal.tsx
│   │   │   ├── UserDetailModal.tsx
│   │   │   ├── SuspendUserModal.tsx
│   │   │   ├── ResolveDisputeModal.tsx
│   │   │   ├── ManualWalletModal.tsx
│   │   │   └── AssignTerritoryModal.tsx
│   │   ├── cards/
│   │   │   ├── KpiCard.tsx
│   │   │   └── ActivityCard.tsx
│   │   └── charts/
│   │       ├── GmvLineChart.tsx   ← Recharts
│   │       └── CategoryBarChart.tsx
│   ├── lib/
│   │   ├── api.ts                 ← Axios instance (baseURL from env, attach cookie token)
│   │   ├── auth.ts                ← getServerSideToken, requireAdmin server util
│   │   └── utils.ts               ← formatPKR, formatDate, cn()
│   ├── hooks/
│   │   ├── useAdminUser.ts
│   │   └── useSettings.ts
│   └── types/
│       └── index.ts               ← shared TypeScript interfaces
├── .env.local.example
└── package.json
```

### 4.2 Portal environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=Kabariya Admin
JWT_COOKIE_NAME=kabariya_admin_token
```

### 4.3 Authentication flow (portal)

- `/login` page: email + password form → POST `/api/v1/auth/admin-login`
- On success: store `accessToken` in httpOnly cookie (set via Next.js route handler)
- Middleware (`middleware.ts`): protect all `/dashboard/*` routes — redirect to `/login` if no valid cookie
- All Axios requests attach the token from cookie automatically
- Logout: clear cookie → redirect to `/login`

### 4.4 Portal page specifications

#### /dashboard
- 4 KPI cards (from GET /admin/analytics): Total Users, Active Listings, GMV This Month (PKR), Open Disputes
- Monthly GMV line chart (Recharts LineChart, last 12 months)
- Quick-action buttons with count badges: "Pending KYC", "Open Disputes", "Pending Withdrawals"
- Recent flagged listings table (5 rows): title, reporter count, actions (Deactivate / Clear Flag)
- Recent activity feed: last 10 events from analytics.recentActivity

#### /users
- DataTable with server-side pagination (query: page, limit, q, role, city, kyc_status, status)
- Columns: Name, Phone, Role (badge), City, KYC (badge), Subscription, Status (badge), Joined, Actions
- Row actions: View (opens /users/[id]), Suspend, Ban, Change Role
- Bulk select + bulk suspend
- Export CSV button → GET /admin/users?format=csv

#### /users/[id]
- Profile card: avatar initial, name, phone, email, role badge, city, status badge
- Stats row: Active Listings, Total Deals, Wallet Balance (PKR), Rating
- KYC Documents section: each doc as clickable thumbnail → opens in modal lightbox (signed S3 URL)
- CNIC number displayed (decrypted) for approved/reviewing admins only
- Subscription card: plan name, expires, status
- Wallet card: balance + "Manual Adjust" button → ManualWalletModal
- Recent transactions table (5 rows)
- Danger Zone: Suspend / Unsuspend / Ban / Change Role buttons
- All actions log to audit_log

#### /kyc
- 3 tabs: Pending (sorted oldest first), Approved, Rejected
- Each row: user name, phone, role, city, submitted date, days waiting
- "Review" button → KYCReviewModal (full-screen side panel):
  - Left panel: CNIC number (decrypted), and 6 document images/PDFs in a scrollable grid
  - Each document labelled (CNIC Front, CNIC Back, SIM, Selfie, Warehouse, Police Cert)
  - Click image → full-screen lightbox
  - Right panel: user summary, Approve button (green), Reject button (red) + textarea
- Optimistic UI: after action, row moves to correct tab

#### /listings
- Tabs: Active, Expired, Flagged (highlighted orange tab), Deactivated, Deleted
- Columns: Thumbnail, Title, Category, Price, City, Seller, Status, Reports, Created, Actions
- Row actions: View (modal with photo carousel + all fields + reporter reasons), Deactivate, Delete, Clear Flag
- Flag count displayed as badge

#### /transactions
- Table: columns: Transaction ID (short), Listing, Buyer, Seller, Agreed Price, Status, Created
- Filter: status tabs + date range picker
- Row click → /transactions/[id]

#### /transactions/[id]
- Two-column: listing card (left) + status timeline (right)
- Buyer and seller cards with quick-action links (view profile)
- Offer history timeline: price chip, message, sender badge, timestamp, status badge
- "View Bond" button → signed PDF URL in new tab
- Admin status override dropdown
- "Open Dispute" button if not already disputed

#### /disputes
- Open disputes queue (default view), filter to Resolved
- Columns: Transaction ID, Raised By, Other Party, Listing, Amount, Days Open, Actions
- Days Open > 3: red cell highlight
- "Resolve" button → ResolveDisputeModal:
  - Full transaction context summary
  - Radio: Award to Buyer / Award to Seller / Mutual Cancellation
  - Resolution note (required, min 20 chars)
  - Confirm → PATCH /admin/disputes/:id/resolve → optimistic UI update

#### /collections
- Table with status filter + "Overdue only" toggle
- Overdue rows: red background
- Columns: Job ID, Listing, Dealer, Seller City, Status badge, SLA Deadline, Created, Actions
- "Assign" button → dealer search modal → POST /admin/collections/:id/assign
- "View Proof" inline if proof_photo_url exists

#### /finance
- Summary KPI cards: Total Dealer Wallets, Commission This Month, Pending Withdrawals (count + PKR total)
- Tabs:
  - **Pending Withdrawals**: table with bank details — Approve / Reject buttons per row
  - **Manual Adjustments**: form (user search autocomplete, Credit/Debit toggle, amount PKR, required note) + recent adjustments table

#### /territories
- Territory list: expandable rows showing assigned dealers
- "New Territory" button → form modal
- Each territory row: Edit (inline) + Delete (blocked if dealers assigned) + Assign Dealer button
- Assign Dealer modal: search user by phone/name (role filtered to dealer roles), select, confirm

#### /subscriptions
- Plans management table: editable inline (name, price, duration, max_listings, analytics toggle, active toggle)
- "New Plan" button
- Active Subscriptions table: user, plan, expires_at, days_remaining, actions (Extend, Reassign)

#### /notifications
- Broadcast form: Title, Body (both with character counter), Target (All / Role / City), Preview card
- Sent broadcasts table: title, target, sent_at, recipient_count

#### /analytics
- KPI dashboard (same as /dashboard but expanded)
- Top Dealers table: name, phone, city, deals, revenue
- Top Categories table with bar chart
- Monthly GMV chart (line + bar combo)

#### /settings
- Settings form (all keys from system_settings table):
  - Commission Rate (%), OTP Expiry (s), OTP Max Attempts, OTP Lockout (min), Listing Expiry (days),
  - Offer Expiry (hours), Collection SLA (min), Max Reassignment Attempts, Min KYC Balance (PKR),
  - Subscription Expiry Warning (days)
- "Save Settings" button → PATCH /admin/settings
- Last updated timestamp + updated by admin name

#### /audit-log
- Paginated table: Timestamp, Admin Name, Action Type, Target, IP
- Filters: admin dropdown, action type, date range
- Row expand: shows JSON diff (payload_before vs payload_after) in a code block
- "Export CSV" button

### 4.5 Sidebar navigation structure

```
Dashboard
Users
  └─ All Users
  └─ KYC Queue  (badge: pending count)
Listings
  └─ All Listings
  └─ Flagged  (badge: count)
Transactions
  └─ All Transactions
  └─ Disputes  (badge: open count)
Collections  (badge: overdue count)
Finance
  └─ Wallet Management
  └─ Withdrawals  (badge: pending count)
Territories
Subscriptions
Notifications
Analytics
Settings
Audit Log
```

Super Admin only sees: Settings, Audit Log (admin role sees all others except system-level settings).

---

## PART 5 — CROSS-CUTTING REQUIREMENTS

### 5.1 Security

- All endpoints (except `/auth/*`, `/payments/webhook/*`, `/config/app-version`, GET `/listings`, GET `/categories`, GET `/territories`) require `verifyToken` middleware
- Admin portal routes require `requireRole('admin', 'super_admin')`
- HTTPS enforced in production via reverse proxy (document in README: use nginx or Caddy)
- `helmet()` applied as first middleware — sets CSP, X-Frame-Options, HSTS, etc.
- CORS: allow `FRONTEND_ORIGINS` env var (comma-separated) for browser clients; mobile clients are exempt from CORS
- All SQL queries use Knex parameterised queries — no raw string interpolation
- CNIC numbers encrypted with AES-256-GCM before DB insert; decrypted only on explicit admin KYC review request
- KYC document S3 bucket has `Block Public Access = ON`; all access via signed URLs only
- Passwords (admin accounts) hashed with bcrypt saltRounds=12
- JWT secrets minimum 64 characters, loaded from environment — never hardcoded
- `hpp()` middleware prevents HTTP parameter pollution

### 5.2 Input validation (Zod)

Every POST/PATCH endpoint must have a Zod schema validated by `middleware/validate.js`. Validation errors return:
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "price", "message": "Price must be a positive integer" }
  ]
}
```

### 5.3 Performance

- DB indexes: defined in schema section above — all foreign keys, all status columns, all created_at columns used in range queries
- Redis cache for `system_settings` (key: `cache:system_settings`, TTL 5 min, invalidate on PATCH /admin/settings)
- Redis cache for `categories` list (key: `cache:categories`, TTL 1 hour)
- Listings endpoint: never return more than 50 per page
- Images in React Native: always use `OptimizedImage` (FastImage) — never `Image` from RN core
- FlatList: always set `keyExtractor`, `getItemLayout` (where row height is fixed), `initialNumToRender=10`, `maxToRenderPerBatch=10`
- Chat messages: paginate 30 per page, newest last, load more on scroll to top
- Socket.io: use Redis adapter (`@socket.io/redis-adapter`) for horizontal scaling readiness

### 5.4 Error handling

- Express: global error handler middleware catches all unhandled errors, returns JSON `{ success:false, message, code, stack(dev only) }`
- React Native: `ErrorBoundary` component wraps the entire app, calls `crashlytics().recordError()`
- Unhandled promise rejections in Node: `process.on('unhandledRejection')` — log to console.error and alert monitoring (do not crash process in production)
- All async controller functions wrapped in `asyncHandler` middleware (wraps with try/catch, passes to next(err))

### 5.5 Monitoring & observability

- `GET /health` → `{ status: 'ok', uptime, timestamp, db: 'connected'|'error' }` — no auth required
- Morgan HTTP logging in JSON format (production), dev format (development)
- All cron job runs logged: `[CRON listingExpiry] Expired 12 listings at 2026-03-10T02:00:00Z`
- BullMQ job failures logged with full error + job data
- Admin audit log covers: all admin actions on users, KYC, listings, transactions, disputes, collections, wallet adjustments, settings changes, territory changes, subscription overrides

### 5.6 Non-functional requirements

| Requirement | Specification |
|---|---|
| Android minimum | API 26 (Android 8.0) |
| iOS minimum | iOS 14 |
| API p95 response time | < 500ms for list endpoints, < 200ms for simple GET |
| Concurrent users | Design for 1,000 concurrent — use connection pooling (pg pool max=20) |
| Offline behaviour | App shows NetworkBanner, shows cached screen content, no crash |
| Locales | English (LTR) + Urdu (RTL) — all strings in i18n files, no hardcoded text |
| RTL | All icons, navigation arrows, and layouts mirror on I18nManager.isRTL |
| App not crash on | Rotate, background/foreground switch, network loss, server error |
| Back button (Android) | Home: double-press to exit with 2s window. Other tabs: go to Home |
| Deep links | All notification types route to correct screen (background + quit state) |
| Token storage | Keychain (iOS) / EncryptedSharedPreferences (Android) — never AsyncStorage |
| Crash reporting | Firebase Crashlytics in both apps, Sentry optional as secondary |
| Force update | Non-dismissible screen when app version < min_version |
| Data currency | All monetary calculations server-side in integer paisa, never float |

### 5.7 CI/CD (`.github/workflows/ci.yml`)

```yaml
On pull_request to main:
  - npm ci (backend + portal)
  - ESLint on all packages
  - Jest unit tests with coverage threshold 60%
  - npx knex migrate:latest (test DB)
  - npx knex seed:run
  - next build (portal)

On push to main (after CI):
  - Deploy backend to staging (Railway deploy or ssh + pm2 reload)
  - Deploy portal to Vercel (via vercel CLI or GitHub integration)
  - Run migration on staging DB
  - Notify Slack on success/failure
```

---

## PART 6 — SEED DATA & INITIAL STATE

After running `npx knex migrate:latest && npx knex seed:run`, the system should have:

1. **Admin user**: `admin@kabariya.pk` / `Admin123!` with role `super_admin`
2. **system_settings**: all 11 rows as defined in Part 1
3. **app_versions**: android + ios rows
4. **subscription_plans**: Basic (free), Pro (PKR 999), Enterprise (PKR 2999)
5. **categories**: 9 top-level + subcategories for Metals, Plastics, Electronics
6. **Demo territories**: Karachi Central, Karachi East, Karachi West, Lahore, Islamabad
7. **Test users** (development only):
   - `03001111111` — customer
   - `03002222222` — local_dealer (KYC pending)
   - `03003333333` — local_dealer (KYC approved, wallet_balance=100000)
   - `03004444444` — city_franchise (KYC approved)
   - All test OTPs: `111111`

---

## PART 7 — README REQUIREMENTS

Create `README.md` in each package root covering:

**backend/README.md:**
- Prerequisites: Node 20, PostgreSQL 15, Redis 7
- Local setup: `cp .env.example .env`, fill vars, `npm install`, `npx knex migrate:latest`, `npx knex seed:run`, `npm run dev`
- Available scripts: `dev`, `start`, `migrate`, `seed`, `test`
- API docs: `npm run dev` then visit `http://localhost:5000/api/docs` (Swagger via swagger-ui-express)
- Environment variable descriptions

**mobile/README.md:**
- Prerequisites: Node 20, React Native CLI, Xcode 14+, Android Studio
- How to run Kabariya app vs Kabariya Pro app
- How to configure `.env` for each app target
- Flipper debugging setup

**portal/README.md:**
- Prerequisites: Node 20
- `cp .env.local.example .env.local`, fill API URL, `npm install`, `npm run dev`
- Build for production: `npm run build`

---

## ACCEPTANCE CRITERIA CHECKLIST

Before marking any module complete, verify ALL of these:

### Auth
- [ ] OTP lockout after 5 wrong attempts, locked for 15 min
- [ ] Resend cooldown 60s enforced server-side
- [ ] Suspended user gets 403 on login with `ACCOUNT_SUSPENDED` code
- [ ] Tokens stored in Keychain — NOT AsyncStorage
- [ ] Force update screen shown for old app version, non-dismissible
- [ ] Refresh token rotation works (old token invalidated on use)

### KYC
- [ ] CNIC `12345-1234567-1` validates; `ABC1234567890` fails
- [ ] CNIC stored encrypted in DB — raw plaintext never in any column
- [ ] KYC doc URLs require signed S3 URL to view — not publicly accessible
- [ ] Rejected KYC shows admin reason in app
- [ ] Approved dealer with zero balance always lands on BalanceGateScreen

### Listings
- [ ] GET /listings?q=copper&city=Karachi returns filtered results
- [ ] Pro dealer only sees listings in assigned territories
- [ ] 5th report auto-flags the listing
- [ ] Listing older than `listing_expiry_days` auto-expires via cron

### Chat
- [ ] Messages appear in < 1s (WebSocket — not polling)
- [ ] Blocked sender's message rejected server-side
- [ ] Image messages render in chat bubbles
- [ ] Unread count badge updates in real-time

### Wallet & Payments
- [ ] Webhook with invalid HMAC returns 400
- [ ] Duplicate webhook is idempotent
- [ ] Balance stored as integer paisa — no floats anywhere
- [ ] Commission deducted on finalization
- [ ] Wallet never goes negative

### Collections
- [ ] Deal finalization auto-creates collection_jobs row
- [ ] Proof photo required before collected→delivered transition
- [ ] SLA cron reassigns unaccepted jobs every 5 min

### Admin Portal
- [ ] Admin login with wrong password: 401
- [ ] Non-admin JWT rejected from /admin/* routes
- [ ] KYC approval triggers push + updates dealer status in-app
- [ ] Suspend user → that user gets 403 on next API call
- [ ] Dispute resolution notifies both parties

### General
- [ ] Offline state: NetworkBanner shown, no crash
- [ ] RTL: all screens mirror in Urdu mode
- [ ] Back button: Home double-press exit, other tabs go to Home
- [ ] All notification taps deep-link to correct screen
- [ ] GET /health returns 200 with `status: ok`
- [ ] All monetary values in paisa — format as PKR X,XXX.XX in UI only

---

*End of Kabariya Complete System Specification — v1.0 — March 2026*
*This document is the single source of truth. Any deviation requires updating this file first.*
