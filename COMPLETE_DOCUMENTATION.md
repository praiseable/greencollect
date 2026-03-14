# Kabariya — Complete Project Documentation

> **Single consolidated documentation file** — Everything in one place.  
> Last consolidated: March 2026.

---

## Table of Contents

1. [Main README](#1-main-readme)
2. [Deployment (gc.directconnect.services)](#2-deployment-gcdirectconnectservices)
3. [Test Users & APK Info](#3-test-users--apk-info)
4. [Chat Debug Test](#4-chat-debug-test)
5. [APK Build Summary](#5-apk-build-summary)
6. [Documentation Hub (index)](#6-documentation-hub-index)
7. [Kabariya End-to-End Validation](#7-kabariya-end-to-end-validation)
8. [Kabariya Spec Implementation Summary](#8-kabariya-spec-implementation-summary)
9. [Listings Backend & Admin](#9-listings-backend--admin)
10. [Database Persistence](#10-database-persistence)
11. [Validation Checklist](#11-validation-checklist)
12. [Product Overview](#12-product-overview)
13. [User Manual](#13-user-manual)
14. [Backend README](#14-backend-readme)
15. [Web Admin README](#15-web-admin-readme)
16. [Web Client README](#16-web-client-readme)
17. [Mobile App README](#17-mobile-app-readme)
18. [Kabariya Complete System Specification](#18-kabariya-complete-system-specification)
19. [Android AVD / Flutter Prompt](#19-android-avd--flutter-prompt)
20. [Cursor Master Development Prompt](#20-cursor-master-development-prompt)

---

## 1. Main README

# 🌍 Kabariya — Geo-Franchise Marketplace Platform

> **Pakistan's leading B2B/B2C marketplace for recyclable and reusable goods**  
> Trade scrap, metals, plastics, electronics, furniture, and more with geo-fenced, franchise-controlled supply chains.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.2+-blue.svg)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

### Overview

**Kabariya** is a production-grade, geo-fenced, franchise-based marketplace platform designed for trading recyclable and reusable goods. Built with Pakistan as the primary market.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | Flutter 3.x (Dart) |
| **Web Frontend** | React.js 18, Vite, TailwindCSS |
| **Backend** | Node.js 18, Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL 15 + PostGIS |
| **Cache** | Redis 7 |
| **Real-time** | Socket.io |

### Quick Start

```bash
git clone https://github.com/praiseable/kabariya.git
cd gc-app
docker compose up -d
docker compose exec backend npx prisma db push
docker compose exec backend node prisma/seed.js
```

- Web Client: http://localhost:3003
- Web Admin: http://localhost:3002
- API Health: http://localhost:4000/health

### Default Admin (after seed)

- **Email**: `admin@kabariya.pk` or `admin@marketplace.pk`
- **Password**: `Admin@123` or `Admin@123456`
- **Role**: SUPER_ADMIN

---

## 2. Deployment (gc.directconnect.services)

### Validation (verified)

| Check | Result |
|-------|--------|
| **Server IP** | `49.13.119.60` |
| **DNS** | `gc.directconnect.services` → `49.13.119.60` ✅ |
| **HTTPS** | TLS on 443, HSTS enabled ✅ |
| **API** | `https://gc.directconnect.services/api/*` → backend ✅ |
| **Stack** | Docker Compose (backend + web-client Nginx + web-admin) |

- **Main site / API:** `https://gc.directconnect.services`
- **Admin portal:** `https://gc.directconnect.services:8080`

### Backend env (backend/.env)

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
PORT=4000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_min_32_chars_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars
```

### Run with Docker (production)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Web admin build

```env
VITE_API_URL=https://gc.directconnect.services/api
```

```bash
cd apps/web-admin && npm run build
```

### Summary

| What | URL / note |
|------|------------|
| **Server IP** | `49.13.119.60` |
| **DNS** | **gc.directconnect.services** → `49.13.119.60` |
| **Backend API** | `https://gc.directconnect.services/api` |
| **Web app** | `https://gc.directconnect.services` |
| **Admin portal** | `https://gc.directconnect.services:8080` |

---

## 3. Test Users & APK Info

### Customer App

- **File**: `apps/mobile/build/app/outputs/flutter-apk/app-customer-release.apk`
- **App Name**: Kabariya

### Pro App

- **File**: `apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk`
- **App Name**: Kabariya Pro

### Test Users (Phone / OTP)

| # | Phone | OTP | Name | Role |
|---|-------|-----|------|------|
| 1 | 03001234567 | 111111 | Ali Hassan | Customer |
| 2 | 03219876543 | 222222 | Bilal Traders | Local Dealer |
| 3 | 03335551234 | 333333 | City Franchise Karachi | City Franchise |
| 4 | 03451112233 | 444444 | National Recyclers | Wholesale |
| 5 | 03001110001 | 550001 | Usman BaraKahu | Local Dealer |
| 6 | 03001110002 | 660002 | G-6 Dealer | Local Dealer |
| 7 | 03001110003 | 770003 | G-8 Dealer | Local Dealer (Zero Balance) |
| 8 | 03001110004 | 880004 | ISB Franchise | City Franchise |

### Email login (backend seed)

- **Dealer**: `dealer@marketplace.pk` / `Dealer@123`
- **Customer**: `customer@marketplace.pk` / `Customer@123`
- **Admin**: `admin@marketplace.pk` / `Admin@123456`

---

## 4. Chat Debug Test

- **Debug flags**: `kChatDebug` (chat_db_service.dart), `kChatProviderDebug` (chat.provider.dart), `_kChatScreenDebug` (chat_screen.dart).
- **Log tags**: `[ChatDB]`, `[ChatProvider]`, `[ChatScreen]`, `[Chat]`, `[App]`.
- **Two AVDs**: Use TEST_USERS (e.g. Customer 03001234567/111111, Dealer 03219876543/222222). Chat is local-first; no backend sync yet — messages don’t cross devices; mock auto-reply after ~2s.

---

## 5. APK Build Summary

- **Customer**: `app-customer-release.apk` — Package `com.kabariya.app`
- **Pro**: `app-pro-release.apk` — Package `com.kabariya.app.pro`
- **Build**: `flutter build apk --release --flavor customer --dart-define=APP_VARIANT=customer` (and pro variant).
- **Install**: `adb install -r apps/mobile/build/app/outputs/flutter-apk/app-customer-release.apk`

---

## 6. Documentation Hub (index)

- **User Manual** — Buyers, sellers, dealers, admins.
- **Product Overview** — Architecture, user flows, roadmap.
- **Database Persistence** — Data safety.
- **Validation Checklist** — Requirements compliance.
- **Live**: https://gc.directconnect.services | **Admin**: https://gc.directconnect.services:8080

---

## 7. Kabariya End-to-End Validation

- **Auth**: OTP send/verify, lockout, cooldown ✅; admin-login, rate limiters ❌/⚠️.
- **Users**: GET /users/me partial (use /auth/me); notification-preferences, FCM, ratings ❌.
- **Listings**: GET/POST/geo-fencing ✅; GET /listings/my ❌; deactivate/reactivate ⚠️.
- **Chat**: User-to-user model (no chat_rooms/listing_id); conversations ✅; media, blocked ⚠️/❌.
- **Transactions**: POST, GET, accept/reject, finalize, bond ✅; cancel, dispute ❌.
- **Wallet**: Payments initiate ✅; ledger, withdraw, webhook ⚠️/❌.
- **Collections, KYC, Territories, Subscriptions, Notifications, Analytics, Admin**: Mostly ✅ with minor gaps.

---

## 8. Kabariya Spec Implementation Summary

- **Backend**: apiResponse.js, GET /health, GET /api/config/app-version, listing favorites/reports, OTP enhancements (suspended 403, lockout 423, cooldown 429), Prisma migrations.
- **Mobile**: getAppVersion(), getListingsFavorites(), toggleListingFavorite().
- **Web admin**: Optional health/app-version panel.

---

## 9. Listings Backend & Admin

- **Storage**: PostgreSQL via Prisma (`Listing`, `ListingImage`, etc.).
- **Create**: `POST /v1/listings` or `POST /api/listings` with JWT; body: title, categoryId, pricePaisa, quantity, unitId, geoZoneId, latitude, longitude, address, cityName, contactNumber. sellerId from JWT.
- **Access**: (1) **GET /api/admin/all-listings** (admin JWT), (2) **Prisma Studio** (`npx prisma studio`), (3) **GET /v1/listings**, **GET /v1/listings/:id**.
- **Admin**: PUT /api/admin/listings/:id/status.

---

## 10. Database Persistence

- **Volumes**: pgdata, uploads, certbot-* (persistent). No `-v` in deploy scripts.
- **Schema**: `prisma db push` (non-destructive). Seed uses upsert (safe re-run).
- **Do not run**: `docker compose down -v`, DROP DATABASE, TRUNCATE.

---

## 11. Validation Checklist

- **Database**: Safe — no destructive ops.
- **Modules**: Country/Region, Currency, Language, Catalog, Geo-Zones, Listings, Subscriptions, Notifications, Chat, Admin, Web Client, Mobile — mostly complete; payments/localization need enhancement.
- **Overall**: ~85% completion.

---

## 12. Product Overview

- **Problem**: Fragmented market, geographic barriers, trust, manual processes, language.
- **Solution**: Geo-fenced digital marketplace (listings, chat, transactions, KYC, multi-currency, Urdu/English).
- **Architecture**: Client (Mobile, Web, Admin) → API (Express + Socket.io) → PostgreSQL, Redis, S3.
- **User flows**: Seller creates listing; buyer finds and contacts; admin manages system.
- **Security**: JWT, RBAC, OTP, bcrypt, HTTPS, CORS, parameterised queries.
- **Roadmap**: Phase 1 ✅ (core); Phase 2 (analytics, payments, bonds, escalation); Phase 3 (AI, multi-country).

---

## 13. User Manual

- **Getting started**: Register (name, email, phone, password), verify phone (OTP), complete profile.
- **Browsing**: Grid/map, filters (category, city, price), sort, listing detail (images, price, map, contact).
- **Creating listing**: Title, category, quantity, unit, price, location (map), description, photos (max 5).
- **Contacting**: Chat, Call, Get directions.
- **Dealers**: Dashboard, listings, orders, analytics, subscription.
- **Admins**: Dashboard, users, categories/product types/units, geo-zones, translations, currencies, payments, subscriptions, analytics, audit logs. Access: https://gc.directconnect.services/admin (or :8080). Default: admin@kabariya.pk / Admin@123.
- **Mobile**: Home, create listing (with map picker), listing detail, notifications, profile. Offline: cached listings.
- **Troubleshooting**: Login, listing not appearing, map, image upload, payment issues.

---

## 14. Backend README

- **Stack**: Node 18, Express, Prisma, PostgreSQL + PostGIS, Redis, Socket.io, JWT, OTP, Multer.
- **Structure**: prisma/schema.prisma, seed.js, src/index.js, routes/*, middleware/auth.js, services/*.
- **Quick start**: backend/.env (DATABASE_URL, REDIS_URL, JWT_SECRET, PORT), `npm install`, `npx prisma db push`, `node prisma/seed.js`, `npm run dev` (port 4000).
- **API**: Auth, Listings, Categories, ProductTypes, Units, GeoZones, Users, Notifications, Chat, Transactions, Subscriptions, Payments, Languages, Translations, Currencies, Countries, Admin (dashboard, users, etc.).
- **WebSocket**: connection, new_listing, new_notification, chat_message, join_room.
- **Docker**: Dockerfile (Alpine), port 4000. Default admin: admin@kabariya.pk / Admin@123.

---

## 15. Web Admin README

- **Stack**: React 18, Vite, TailwindCSS, React Router, Axios.
- **Structure**: src/App.jsx, pages/* (Login, Dashboard, Users, Categories, ProductTypes, Units, Listings, GeoZones, Languages, Translations, Countries, Currencies, Payments, Subscriptions, Analytics, Notifications), services/api.js.
- **Quick start**: .env (VITE_API_BASE_URL), `npm run dev` (e.g. 5174).
- **Admin login**: admin@kabariya.pk / Admin@123.
- **Routes**: /login, /dashboard, /users, /catalog/*, /listings, /geo-zones, /languages, /translations, /countries, /currencies, /payments, /subscriptions, /analytics, /notifications; plus Marketplace (same as app): /marketplace, listings, create, profile, chat, transactions, wallet.
- **Docker**: docker build -t gc-web-admin; docker run -p 3002:80.

---

## 16. Web Client README

- **Stack**: React 18, Vite, TailwindCSS, Zustand, Leaflet.
- **Routes**: /, /login, /register, /listings, /listings/:id, /create-listing, /dashboard, /profile, /notifications, /subscriptions, /transactions, /wallet, /chat, /chat/:roomId.
- **Maps**: Leaflet + React-Leaflet, OpenStreetMap.
- **Quick start**: .env (VITE_API_BASE_URL), `npm run dev` (e.g. 5173). Docker: port 3003.

---

## 17. Mobile App README

- **Stack**: Flutter 3.x, Riverpod, GoRouter, easy_localization, fl_chart.
- **Structure**: lib/main.dart, core/ (mock, models, providers, router, theme), features/* (splash, onboarding, auth, home, listings, notifications, profile, transactions, subscription, wallet, chat, analytics, settings, shell).
- **Prerequisites**: Flutter ≥3.16, Android SDK, Java 17+.
- **Run**: `flutter pub get`, `flutter run` or `flutter run -d emulator-5554`.
- **Build**: `flutter build apk --debug` | `--release` | `--split-per-abi`; `flutter build appbundle --release`.
- **Variants**: APP_VARIANT=customer (Kabariya) or pro (Kabariya Pro). Flavors: customer, pro.
- **Test accounts**: See Test Users section above. Config: Google Maps API key in AndroidManifest; package com.kabariya.app, minSdk 24, targetSdk 35.

---

## 18. Kabariya Complete System Specification

*The following is the full Kabariya Complete System Specification (kabariya-complete-spec.md).*
# KABARIYA â€” Complete System Build Specification
## CursorAI Agentic Mode Prompt

> **HOW TO USE:** Open your monorepo in Cursor â†’ press `CMD+SHIFT+P` â†’ select **"Cursor: Open Composer (Agentic)"** â†’ paste this entire file â†’ press Enter. Cursor will scaffold, write, and wire every file listed below without further prompting.

---

## ARCHITECTURE OVERVIEW

```
kabariya/
â”œâ”€â”€ backend/          â† Single Node.js/Express API â€” shared by ALL clients
â”œâ”€â”€ mobile/           â† React Native (Expo or bare) â€” two app targets
â”‚   â”œâ”€â”€ apps/
â”‚   â”‚   â”œâ”€â”€ kabariya/         â† Customer app
â”‚   â”‚   â””â”€â”€ kabariya-pro/     â† Dealer/franchise app
â”‚   â””â”€â”€ src/                  â† Shared components, services, screens
â””â”€â”€ portal/           â† Next.js 14 Admin Portal (web) â€” consumes same backend API
```

**Key constraint respected throughout:** The Express backend exposes one API (`/api/v1/`). Mobile apps and the admin portal both authenticate against it. Admin routes are protected by `requireRole('admin')` middleware â€” there is NO separate backend for the portal.

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

## TECH STACK â€” LOCKED CHOICES

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4
- **Database:** PostgreSQL 15 via **Knex.js** (query builder + migrations)
- **Cache / Rate-limit store:** Redis 7 via **ioredis**
- **Real-time:** Socket.io 4
- **Auth:** JWT (jsonwebtoken) â€” access token 15 min, refresh token 30 days
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

## PART 1 â€” DATABASE SCHEMA (PostgreSQL via Knex migrations)

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

## PART 2 â€” BACKEND (Node.js / Express)

### 2.1 Project structure

```
backend/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app.js                    â† Express app setup (no server.listen here)
â”‚   â”œâ”€â”€ server.js                 â† HTTP server + Socket.io attach + listen
â”‚   â”œâ”€â”€ config/
â”‚   â”‚   â”œâ”€â”€ db.js                 â† Knex instance
â”‚   â”‚   â”œâ”€â”€ redis.js              â† ioredis client
â”‚   â”‚   â”œâ”€â”€ s3.js                 â† AWS S3 client
â”‚   â”‚   â”œâ”€â”€ firebase.js           â† Firebase Admin SDK init
â”‚   â”‚   â””â”€â”€ env.js                â† Zod-validated env schema
â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”œâ”€â”€ auth.js               â† verifyToken, requireRole(...roles)
â”‚   â”‚   â”œâ”€â”€ validate.js           â† validate(zodSchema) factory
â”‚   â”‚   â”œâ”€â”€ requireKyc.js         â† KYC approved check (Pro users)
â”‚   â”‚   â”œâ”€â”€ requireSubscription.jsâ† Active subscription check
â”‚   â”‚   â”œâ”€â”€ rateLimiter.js        â† Global + auth-specific limiters
â”‚   â”‚   â”œâ”€â”€ uploadErrorHandler.js â† Multer error handler
â”‚   â”‚   â””â”€â”€ auditLog.js           â† Admin action logger
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ tokenService.js       â† generateTokens, refreshToken, revokeToken
â”‚   â”‚   â”œâ”€â”€ otpService.js         â† sendOtp, verifyOtp, checkLockout
â”‚   â”‚   â”œâ”€â”€ uploadService.js      â† All multer-s3 instances + deleteFile
â”‚   â”‚   â”œâ”€â”€ notificationService.jsâ† sendPush, sendSms, sendBroadcast
â”‚   â”‚   â”œâ”€â”€ walletService.js      â† creditWallet, debitWallet (atomic)
â”‚   â”‚   â”œâ”€â”€ paymentGateway.js     â† initiatePayment (JazzCash/Easypaisa)
â”‚   â”‚   â”œâ”€â”€ bondService.js        â† generateBond (PDFKit + S3 upload)
â”‚   â”‚   â”œâ”€â”€ collectionService.js  â† createJob, assignDealer, escalate
â”‚   â”‚   â”œâ”€â”€ analyticsService.js   â† dealer stats, admin KPIs
â”‚   â”‚   â””â”€â”€ encryptionService.js  â† AES-256-GCM encrypt/decrypt
â”‚   â”œâ”€â”€ controllers/
â”‚   â”‚   â”œâ”€â”€ authController.js
â”‚   â”‚   â”œâ”€â”€ userController.js
â”‚   â”‚   â”œâ”€â”€ kycController.js
â”‚   â”‚   â”œâ”€â”€ listingController.js
â”‚   â”‚   â”œâ”€â”€ chatController.js
â”‚   â”‚   â”œâ”€â”€ notificationController.js
â”‚   â”‚   â”œâ”€â”€ transactionController.js
â”‚   â”‚   â”œâ”€â”€ offerController.js
â”‚   â”‚   â”œâ”€â”€ walletController.js
â”‚   â”‚   â”œâ”€â”€ collectionController.js
â”‚   â”‚   â”œâ”€â”€ territoryController.js
â”‚   â”‚   â”œâ”€â”€ ratingController.js
â”‚   â”‚   â”œâ”€â”€ subscriptionController.js
â”‚   â”‚   â”œâ”€â”€ analyticsController.js
â”‚   â”‚   â””â”€â”€ adminController.js
â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â”œâ”€â”€ index.js              â† mounts all routers under /api/v1
â”‚   â”‚   â”œâ”€â”€ auth.js
â”‚   â”‚   â”œâ”€â”€ users.js
â”‚   â”‚   â”œâ”€â”€ kyc.js
â”‚   â”‚   â”œâ”€â”€ listings.js
â”‚   â”‚   â”œâ”€â”€ chat.js
â”‚   â”‚   â”œâ”€â”€ notifications.js
â”‚   â”‚   â”œâ”€â”€ transactions.js
â”‚   â”‚   â”œâ”€â”€ wallet.js
â”‚   â”‚   â”œâ”€â”€ collections.js
â”‚   â”‚   â”œâ”€â”€ territories.js
â”‚   â”‚   â”œâ”€â”€ ratings.js
â”‚   â”‚   â”œâ”€â”€ subscriptions.js
â”‚   â”‚   â”œâ”€â”€ analytics.js
â”‚   â”‚   â”œâ”€â”€ payments.js           â† Webhook endpoint
â”‚   â”‚   â””â”€â”€ admin/
â”‚   â”‚       â”œâ”€â”€ index.js          â† mounts all admin routers
â”‚   â”‚       â”œâ”€â”€ users.js
â”‚   â”‚       â”œâ”€â”€ kyc.js
â”‚   â”‚       â”œâ”€â”€ listings.js
â”‚   â”‚       â”œâ”€â”€ transactions.js
â”‚   â”‚       â”œâ”€â”€ disputes.js
â”‚   â”‚       â”œâ”€â”€ collections.js
â”‚   â”‚       â”œâ”€â”€ territories.js
â”‚   â”‚       â”œâ”€â”€ wallet.js
â”‚   â”‚       â”œâ”€â”€ subscriptions.js
â”‚   â”‚       â”œâ”€â”€ notifications.js
â”‚   â”‚       â”œâ”€â”€ analytics.js
â”‚   â”‚       â”œâ”€â”€ settings.js
â”‚   â”‚       â””â”€â”€ auditLog.js
â”‚   â”œâ”€â”€ sockets/
â”‚   â”‚   â””â”€â”€ chatSocket.js         â† Socket.io event handlers
â”‚   â”œâ”€â”€ jobs/
â”‚   â”‚   â”œâ”€â”€ queue.js              â† BullMQ queue setup
â”‚   â”‚   â”œâ”€â”€ workers/
â”‚   â”‚   â”‚   â”œâ”€â”€ notificationWorker.js
â”‚   â”‚   â”‚   â””â”€â”€ paymentWorker.js
â”‚   â”‚   â””â”€â”€ cron/
â”‚   â”‚       â”œâ”€â”€ listingExpiryJob.js
â”‚   â”‚       â”œâ”€â”€ offerExpiryJob.js
â”‚   â”‚       â”œâ”€â”€ collectionSlaJob.js
â”‚   â”‚       â””â”€â”€ subscriptionExpiryJob.js
â”‚   â””â”€â”€ utils/
â”‚       â”œâ”€â”€ apiResponse.js        â† success(), error(), paginated()
â”‚       â”œâ”€â”€ pagination.js         â† parsePaginationQuery, buildMeta
â”‚       â””â”€â”€ phoneFormat.js        â† normalize Pakistani phone numbers
â”œâ”€â”€ migrations/                   â† All Knex migration files
â”œâ”€â”€ seeds/                        â† Knex seed files
â”œâ”€â”€ knexfile.js
â”œâ”€â”€ .env.example
â””â”€â”€ package.json
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
// â†’ { success: true, data: {...} }

// Paginated list
res.json(paginated(items, meta))
// â†’ { success: true, data: [...], meta: { page, limit, total, totalPages, hasNext, hasPrev } }

// Error
res.status(code).json(error(message, code, errors))
// â†’ { success: false, message: "...", code: "ERROR_CODE", errors: [{field, message}] }
```

### 2.4 Authentication & Session â€” Complete Specification

#### Routes (`src/routes/auth.js`)

```
POST /api/v1/auth/send-otp
  Body: { phone: string, role: string }
  - Normalize phone to 03XXXXXXXXX format
  - Check user.status â€” if suspended/banned return 403 immediately
  - Check otp_codes for existing valid code â€” if within cooldown (otp_resend_cooldown_seconds) return 429
  - Check Redis key otp_lock:<phone> â€” if exists return 423 with lockedUntil
  - Generate 6-digit random code, hash with bcrypt(10), store in otp_codes with expires_at = now + otp_expiry_seconds
  - In dev/test: return code in response body. In production: send via Twilio SMS
  - Return: { success: true, message: "OTP sent", expiresIn: 300, cooldownSeconds: 60 }

POST /api/v1/auth/verify-otp
  Body: { phone: string, code: string, role: string }
  - Check Redis otp_lock:<phone> â€” if locked return 423 { code: "OTP_LOCKED", lockedUntil }
  - Find latest valid otp_codes row for phone
  - Increment attempts; if attempts >= otp_max_attempts: set Redis otp_lock:<phone> = 1, TTL = otp_lockout_minutes * 60; return 423
  - Verify bcrypt.compare(code, stored hash) â€” if mismatch: return 400 { message: "Incorrect OTP", attemptsLeft: N }
  - Mark otp_codes.used = true
  - Upsert user (create if new, update role if changed)
  - Call generateTokens(userId, role)
  - Store refresh token hash in refresh_tokens
  - Return: { success: true, data: { user: { id, name, phone, role, city, kycStatus, walletBalance, notificationPreferences }, accessToken, refreshToken } }

POST /api/v1/auth/refresh
  Body: { refreshToken: string }
  - Verify JWT signature (REFRESH_SECRET)
  - Find refresh_tokens row by userId where NOT revoked AND expires_at > now
  - bcrypt.compare(incomingToken, token_hash) â€” if no match: 401
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
// verifyToken â€” attach req.user from JWT
// requireRole(...roles) â€” 403 if user.role not in roles
// requireKyc â€” for Pro users: 403 { code: 'KYC_REQUIRED' } if not approved
//   Customer role NEVER hits this middleware
// requireSubscription â€” 402 { code: 'SUBSCRIPTION_REQUIRED' } if no active sub
// requireBalance â€” 402 { code: 'INSUFFICIENT_BALANCE' } if wallet_balance = 0 (Pro only)
```

#### Rate limiters (`src/middleware/rateLimiter.js`)

```javascript
// globalLimiter: 100 req / 15 min per IP â€” apply to all routes
// authLimiter: 10 req / 15 min per IP â€” apply to /auth/* routes
// otpLimiter: 3 req / 10 min per phone number (keyed on req.body.phone, Redis store)
```

### 2.5 User Management Routes

```
GET    /api/v1/users/me                     â€” own profile
PATCH  /api/v1/users/me                     â€” update name, email, city
PATCH  /api/v1/users/me/notification-preferences  â€” update notif prefs
POST   /api/v1/users/me/fcm-token           â€” { fcmToken, platform }
GET    /api/v1/users/:id/ratings            â€” public ratings for a user
GET    /api/v1/users/:id/rating-summary     â€” { averageStars, totalCount }
POST   /api/v1/users/:id/block              â€” block a user
DELETE /api/v1/users/:id/block              â€” unblock

--- Admin routes (require role: admin|super_admin) ---
GET    /api/v1/admin/users                  â€” paginated list, filters: role, city, kyc_status, status, q(search)
GET    /api/v1/admin/users/:id              â€” full profile + stats
PATCH  /api/v1/admin/users/:id/suspend      â€” { reason } â€” sets status=suspended, logs audit
PATCH  /api/v1/admin/users/:id/unsuspend    â€” clears suspension
PATCH  /api/v1/admin/users/:id/ban          â€” permanent ban, logs audit
PATCH  /api/v1/admin/users/:id/role         â€” { role } â€” change role, logs audit
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
GET   /api/v1/admin/kyc                     â€” queue, filter: status, sort: submitted_at ASC
GET   /api/v1/admin/kyc/:userId             â€” full submission with DECRYPTED cnic, signed S3 URLs (5 min expiry) for all docs
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
  - For Pro users (local_dealer): join user_territories â†’ territories, filter by city+areas
  - For city_franchise: include all child territory areas
  - For wholesale/admin: no territory filter
  - Text search on title + description (PostgreSQL full-text or ILIKE)
  - Return each listing with: seller { id, name, avg_rating, rating_count }

GET    /api/v1/listings/favorites            â€” own favourited listings
GET    /api/v1/listings/my                   â€” own listings (all statuses)
GET    /api/v1/listings/:id                  â€” single listing (increments view_count)
POST   /api/v1/listings                      â€” create (requireKyc for Pro, file upload for photos)
PATCH  /api/v1/listings/:id                  â€” update (owner only)
PATCH  /api/v1/listings/:id/deactivate       â€” owner or admin
PATCH  /api/v1/listings/:id/reactivate       â€” owner only
DELETE /api/v1/listings/:id                  â€” soft delete (owner or admin)
POST   /api/v1/listings/:id/favorite         â€” toggle favourite
POST   /api/v1/listings/:id/report           â€” { reason }

--- Admin listing routes ---
GET    /api/v1/admin/listings                â€” all statuses, filter: status, is_flagged, city, user_id
PATCH  /api/v1/admin/listings/:id/deactivate â€” admin deactivate
PATCH  /api/v1/admin/listings/:id/clear-flag â€” clear is_flagged
DELETE /api/v1/admin/listings/:id            â€” admin delete (hard or soft)
```

**Auto-flag rule:** When listing_reports count for a listing reaches 5, set `listings.is_flagged = true` and `flag_count = 5`. Fire a notification to all admin users.

**Listing expiry cron** (`cron/listingExpiryJob.js`): `0 2 * * *` â€” update status='expired' where status='active' AND created_at < now - listing_expiry_days AND deleted_at IS NULL. Also clear `expires_at` from listings table.

### 2.8 Chat Routes & Socket Events

```
POST /api/v1/chat/rooms                      â€” { listingId?, recipientId } â€” create or get existing
GET  /api/v1/chat/rooms                      â€” own rooms, each with: otherParty, lastMessage, unreadCount
GET  /api/v1/chat/rooms/:id/messages?page=1  â€” paginated messages (30 per page), oldest first
POST /api/v1/chat/rooms/:id/media            â€” upload image (uploadChatMedia), returns { mediaUrl }
```

**Socket.io events** (`sockets/chatSocket.js`):

```
Auth: verify JWT from socket.handshake.auth.token on every connection.
On connect: socket.join("user:" + userId)

Client â†’ Server:
  join_room    { roomId }
    â†’ socket.join(roomId)
    â†’ mark all unread messages in room as delivered_at=now
    â†’ emit messages_delivered to room

  send_message { roomId, content, type('text'|'image'), mediaUrl? }
    â†’ check blocked_users â€” if recipient blocked sender: emit error 'BLOCKED'
    â†’ insert chat_messages row
    â†’ update chat_rooms.last_message_at
    â†’ emit new_message to room roomId with full message object
    â†’ if recipient NOT in room: enqueue push notification (BullMQ)

  mark_read    { roomId }
    â†’ UPDATE chat_messages SET read_at=now WHERE room_id=roomId AND sender_id != userId AND read_at IS NULL
    â†’ emit messages_read { roomId, readAt } to room

Server â†’ Client events emitted:
  new_message      { id, roomId, senderId, content, type, mediaUrl, createdAt }
  messages_read    { roomId, readAt }
  messages_delivered { roomId, deliveredAt }
```

### 2.9 Notifications Routes

```
GET   /api/v1/notifications?page=1&limit=20
GET   /api/v1/notifications/unread-count     â€” { count }
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

**`notificationService.js` â€” `sendPush()` contract:**

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

**Notification triggers â€” every one of these must call `sendPush()`:**

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
| Collection accepted â†’ seller | seller | `collection_update` |
| Collection en_route â†’ seller | seller | `collection_update` |
| Collection collected â†’ seller | seller | `collection_update` |
| Collection delivered â†’ seller | seller | `collection_update` |
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
  - Check if both parties have agreed â†’ call finalizeTransaction()
    (A deal is finalized when the offer sender and receiver are both buyer and seller â€” i.e. one accept is enough)
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
PATCH /api/v1/admin/transactions/:id/status   â€” force status change { status }
GET   /api/v1/admin/disputes?status=open&page=
PATCH /api/v1/admin/disputes/:id/resolve
  Body: { resolutionType: 'award_buyer'|'award_seller'|'mutual_cancellation', note: string }
  - Update disputes row
  - Update transaction.status = 'completed' (or 'cancelled' for mutual)
  - sendPush to both parties
  - Log audit
```

**`finalizeTransaction()` â€” internal service function:**
```
1. Update transactions: status='finalized', finalized_at=now, agreed_price, agreed_quantity
2. Update listing.status = 'sold'
3. Read commission_rate_percent from system_settings
4. commissionAmount = Math.round(agreed_price * rate / 100) â€” integer paisa
5. debitWallet({ userId: sellerId, amount: commissionAmount, referenceType:'commission', referenceId:transactionId })
   If InsufficientBalanceError: block finalization with 402
6. bondService.generateBond(transactionId)
7. collectionService.createCollectionJob(transactionId)
8. sendPush to buyer: "Deal agreed! Your collection has been arranged."
9. sendPush to seller: "Deal agreed! A dealer will collect your scrap."
```

**Offer expiry cron** (`cron/offerExpiryJob.js`): `*/15 * * * *` â€” UPDATE offers SET status='expired' WHERE status='pending' AND expires_at < now. For each: sendPush to sender.

### 2.11 Wallet & Payment Routes

```
GET  /api/v1/wallet                          â€” { balance, recentLedger: last 5 entries }
GET  /api/v1/wallet/ledger?page=1&limit=20   â€” full paginated ledger
POST /api/v1/wallet/recharge
  Body: { amountPaisa: number (min 10000 = 100 PKR), gateway: 'jazzcash'|'easypaisa' }
  - Validate amount min/max (10000â€“5000000 paisa)
  - Call paymentGateway.initiatePayment()
  - Return { paymentUrl, transactionId }

POST /api/v1/payments/webhook/:gateway       â€” NO auth middleware (public)
  - Gateway: jazzcash | easypaisa
  - Verify HMAC signature FIRST â€” if invalid: log and return 400
  - Find payment_transactions by gateway_ref â€” if not found: return 404
  - Idempotency: if status !== 'pending' return 200 immediately
  - On success: UPDATE status='success', call creditWallet(), sendPush
  - On failure: UPDATE status='failed', sendPush

POST /api/v1/wallet/withdraw
  Body: { amountPaisa, bankName, accountNumber, accountName }
  - Validate amountPaisa <= user.wallet_balance
  - Insert withdrawal_requests row

GET  /api/v1/wallet/withdrawals              â€” own withdrawal request history

--- Admin wallet routes ---
GET    /api/v1/admin/wallet/summary          â€” { totalBalance, commissionThisMonth, pendingWithdrawals }
GET    /api/v1/admin/wallet/:userId/ledger   â€” dealer's full ledger
POST   /api/v1/admin/wallet/:userId/adjust
  Body: { type:'credit'|'debit', amountPaisa, note (required) }
  - Call creditWallet or debitWallet
  - Log audit
GET    /api/v1/admin/withdrawals?status=pending&page=
PATCH  /api/v1/admin/withdrawals/:id/approve
  Body: { note? }
  - Update status='approved', processed_by, processed_at
  - The actual bank transfer is manual â€” this just marks it approved
  - Log audit
PATCH  /api/v1/admin/withdrawals/:id/reject
  Body: { note (required) }
  - Update status='rejected'
  - sendPush to user: "Withdrawal request rejected: <note>"
  - Log audit
```

**`walletService.js` rules:**
- ALL amounts in integer paisa â€” validate with `Number.isInteger()`, reject floats
- All DB wallet operations in a Knex transaction (BEGIN/COMMIT)
- Never allow balance to go below 0 â€” throw `InsufficientBalanceError`
- `balance_after` in ledger = current balance AFTER the operation

### 2.12 Collections Routes

```
GET   /api/v1/collections?status=&page=       â€” dealer's own jobs
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
  - Enforce order: acceptedâ†’en_routeâ†’arrivedâ†’collectedâ†’delivered (no skipping)
  - If advancing to 'collected': require proof_photo_url to exist first (409 if not)
  - Set the corresponding *_at timestamp
  - sendPush to seller on each step
  - If status='delivered': call transactionController.completeTransaction()

PATCH /api/v1/collections/:id/proof           â€” upload proof photo (multipart), uploadCollectionProof
PATCH /api/v1/collections/:id/weight
  Body: { actualWeight: number }
  - Store actual_weight
  - If |actualWeight - listed_weight| / listed_weight > 0.1: set weight_discrepancy_flagged=true
    sendPush to admin: "Weight discrepancy on collection #<id>"

--- Admin collection routes ---
GET   /api/v1/admin/collections?status=&page=
PATCH /api/v1/admin/collections/:id/assign    â€” { dealerId } â€” manual assign
```

**`collectionService.createCollectionJob(transactionId)`:**
```
1. Read transaction â†’ get listing.city, listing.area, listing.quantity as listed_weight
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
GET  /api/v1/territories                     â€” all territories (public)
GET  /api/v1/territories/mine                â€” dealer's assigned territories

--- Admin ---
POST   /api/v1/admin/territories             â€” { name, city, areas:[], parentTerritoryId? }
PATCH  /api/v1/admin/territories/:id
DELETE /api/v1/admin/territories/:id         â€” block if user_territories exists (409)
POST   /api/v1/admin/territories/:id/dealers â€” { userId } assign dealer
DELETE /api/v1/admin/territories/:id/dealers/:userId â€” remove dealer
GET    /api/v1/admin/territories/:id/dealers â€” list dealers assigned to this territory
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
GET /api/v1/users/:id/rating-summary          â€” { averageStars, totalCount, distribution:{1:..,5:..} }
```

### 2.15 Subscription Routes

```
GET  /api/v1/subscriptions/plans              â€” active plans ordered by sort_order
GET  /api/v1/subscriptions/mine               â€” current active subscription or null
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
GET    /api/v1/admin/subscriptions            â€” all active subscriptions
POST   /api/v1/admin/subscriptions/plans      â€” create plan
PATCH  /api/v1/admin/subscriptions/plans/:id  â€” edit plan
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
    zoneRank: { rank, total } â€” rank this dealer by deal count among dealers in same territories,
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
GET   /api/v1/admin/settings           â€” all system_settings rows
PATCH /api/v1/admin/settings           â€” body: { key: value, ... } â€” bulk update
  - For each key: UPDATE system_settings, UPDATE updated_by=admin, updated_at=now
  - Log audit for each changed key with payload_before/payload_after
  - Reload settings cache (store in Redis with key 'system_settings', invalidate on update)

GET   /api/v1/admin/audit-log?adminId=&actionType=&from=&to=&page=
  - Paginated audit log
  - Export: GET /api/v1/admin/audit-log/export?format=csv â€” stream CSV response

POST  /api/v1/admin/notifications/broadcast   â€” see 2.9
```

### 2.18 BullMQ Jobs

Create queues in `jobs/queue.js`:
- `notificationQueue` â€” push notifications + SMS fallback
- `paymentQueue` â€” webhook processing (idempotent)

Workers in `jobs/workers/`:
- `notificationWorker.js` â€” processes `sendPush` jobs, max concurrency 10
- `paymentWorker.js` â€” processes payment confirmations, max concurrency 3

Cron jobs registered in `server.js` on startup:
- listingExpiryJob, offerExpiryJob, collectionSlaJob, subscriptionExpiryJob

### 2.19 File Upload Service (`services/uploadService.js`)

```javascript
// Multer instances â€” all use multer-s3 uploading directly to S3

uploadListingPhotos   â€” fieldName='photos', maxCount=5, images only (jpeg/png/webp), max 5MB each
uploadKycDoc          â€” single file, fieldName varies per call, images + pdf, max 10MB
uploadCollectionProof â€” single file, fieldName='proof', images only, max 5MB
uploadChatMedia       â€” single file, fieldName='media', images only, max 5MB
uploadAvatar          â€” single file, fieldName='avatar', images only, max 2MB

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

## PART 3 â€” REACT NATIVE MOBILE APPS

### 3.1 Monorepo structure

```
mobile/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ kabariya/                  â† Customer app
â”‚   â”‚   â”œâ”€â”€ android/
â”‚   â”‚   â”œâ”€â”€ ios/
â”‚   â”‚   â””â”€â”€ index.js               â† registers 'kabariya' app name
â”‚   â””â”€â”€ kabariya-pro/              â† Dealer/franchise app
â”‚       â”œâ”€â”€ android/
â”‚       â”œâ”€â”€ ios/
â”‚       â””â”€â”€ index.js               â† registers 'kabariyaPro' app name
â””â”€â”€ src/                           â† Shared code for both apps
    â”œâ”€â”€ config/
    â”‚   â”œâ”€â”€ api.js                 â† Axios instance with interceptors
    â”‚   â”œâ”€â”€ constants.js           â† app-specific flags injected at build time
    â”‚   â””â”€â”€ i18n.js                â† react-i18next setup, en.json + ur.json
    â”œâ”€â”€ stores/
    â”‚   â”œâ”€â”€ authStore.js           â† Zustand: user, tokens, login/logout
    â”‚   â”œâ”€â”€ notificationStore.js   â† Zustand: unread count
    â”‚   â””â”€â”€ settingsStore.js       â† Zustand: language, notif prefs
    â”œâ”€â”€ services/
    â”‚   â”œâ”€â”€ authStorage.js         â† react-native-keychain wrapper
    â”‚   â”œâ”€â”€ socketService.js       â† Socket.io client singleton
    â”‚   â””â”€â”€ pushService.js         â† FCM setup, token register
    â”œâ”€â”€ navigation/
    â”‚   â”œâ”€â”€ RootNavigator.js       â† auth check â†’ splash â†’ onboarding â†’ main
    â”‚   â”œâ”€â”€ AuthNavigator.js       â† Login, OTP, Register
    â”‚   â”œâ”€â”€ MainNavigator.js       â† Bottom tabs
    â”‚   â”œâ”€â”€ HomeStack.js
    â”‚   â”œâ”€â”€ ListingStack.js
    â”‚   â”œâ”€â”€ ProfileStack.js
    â”‚   â””â”€â”€ NotificationNavigator.js â† deep-link routing on push tap
    â”œâ”€â”€ screens/
    â”‚   â”œâ”€â”€ SplashScreen.js
    â”‚   â”œâ”€â”€ OnboardingScreen.js
    â”‚   â”œâ”€â”€ LoginScreen.js
    â”‚   â”œâ”€â”€ OTPScreen.js
    â”‚   â”œâ”€â”€ RegisterScreen.js
    â”‚   â”œâ”€â”€ HomeScreen.js
    â”‚   â”œâ”€â”€ ListingsScreen.js
    â”‚   â”œâ”€â”€ ListingDetailScreen.js
    â”‚   â”œâ”€â”€ CreateListingScreen.js  â† 5-step wizard
    â”‚   â”œâ”€â”€ EditListingScreen.js
    â”‚   â”œâ”€â”€ ChatInboxScreen.js
    â”‚   â”œâ”€â”€ ChatScreen.js
    â”‚   â”œâ”€â”€ NotificationsScreen.js
    â”‚   â”œâ”€â”€ ProfileScreen.js
    â”‚   â”œâ”€â”€ EditProfileScreen.js
    â”‚   â”œâ”€â”€ TransactionsScreen.js
    â”‚   â”œâ”€â”€ TransactionDetailScreen.js
    â”‚   â”œâ”€â”€ NegotiationScreen.js
    â”‚   â”œâ”€â”€ BondViewerScreen.js
    â”‚   â”œâ”€â”€ SettingsScreen.js
    â”‚   â”œâ”€â”€ SubscriptionScreen.js
    â”‚   â”œâ”€â”€ FavoritesScreen.js
    â”‚   â”œâ”€â”€ ForceUpdateScreen.js
    â”‚   â””â”€â”€ pro/                   â† Pro-only screens (not rendered in Kabariya app)
    â”‚       â”œâ”€â”€ KYCStep1Screen.js  â† CNIC
    â”‚       â”œâ”€â”€ KYCStep2Screen.js  â† SIM
    â”‚       â”œâ”€â”€ KYCStep3Screen.js  â† Selfie
    â”‚       â”œâ”€â”€ KYCStep4Screen.js  â† Warehouse
    â”‚       â”œâ”€â”€ KYCStep5Screen.js  â† Police cert
    â”‚       â”œâ”€â”€ KYCStep6Screen.js  â† Review + submit
    â”‚       â”œâ”€â”€ KYCStatusScreen.js
    â”‚       â”œâ”€â”€ BalanceGateScreen.js
    â”‚       â”œâ”€â”€ WalletScreen.js
    â”‚       â”œâ”€â”€ RechargeScreen.js
    â”‚       â”œâ”€â”€ WithdrawScreen.js
    â”‚       â”œâ”€â”€ CollectionsScreen.js
    â”‚       â”œâ”€â”€ CollectionDetailScreen.js
    â”‚       â”œâ”€â”€ TerritoryScreen.js
    â”‚       â”œâ”€â”€ MyRatingScreen.js
    â”‚       â””â”€â”€ AnalyticsScreen.js
    â”œâ”€â”€ components/
    â”‚   â”œâ”€â”€ ListingCard.js
    â”‚   â”œâ”€â”€ FilterPanel.js         â† bottom sheet
    â”‚   â”œâ”€â”€ OptimizedImage.js      â† FastImage wrapper with shimmer
    â”‚   â”œâ”€â”€ SkeletonLoader.js
    â”‚   â”œâ”€â”€ ErrorBoundary.js
    â”‚   â”œâ”€â”€ NetworkBanner.js       â† offline banner
    â”‚   â”œâ”€â”€ StarRating.js
    â”‚   â”œâ”€â”€ StatusBadge.js
    â”‚   â””â”€â”€ EmptyState.js
    â””â”€â”€ hooks/
        â”œâ”€â”€ useNetworkStatus.js
        â”œâ”€â”€ usePagination.js
        â””â”€â”€ useDebounce.js
```

### 3.2 App startup flow (RootNavigator.js)

```
1. Show SplashScreen (1.5s minimum)
2. Call GET /config/app-version â€” compare with current app version
   If forceUpdate: render ForceUpdateScreen (non-dismissible), stop here
3. Read tokens from Keychain
   If no tokens: navigate to OnboardingScreen (first launch) or LoginScreen (returning)
4. Call POST /auth/refresh â€” if fails: navigate to LoginScreen
5. Call GET /users/me â€” populate authStore
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
//           On failure: authStore.logout() â†’ navigate to Login
// All network errors: throw { userMessage: 'No internet connection' } if no network
// All 5xx errors: throw { userMessage: 'Server error. Please try again.' }
```

### 3.4 Key screen specifications

#### LoginScreen.js
- Phone input (Pakistan format: 03XXXXXXXXX, max 11 digits)
- Role picker: Customer / (Pro only: Local Dealer / City Franchise / Wholesale)
- "Send OTP" button â†’ POST /auth/send-otp
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
- Search bar (debounced 500ms â†’ GET /listings?q=)
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
Step 2: Photos â€” react-native-image-picker, grid of up to 5, remove/add, skip allowed
Step 3: Title*, Description, Quantity*, Unit picker*, Price (PKR)*, Negotiable toggle, Contact phone, Address
Step 4: City*, Area text input
Step 5: Preview of all data â€” "Edit" links per section, "Submit" button
         On submit: multipart POST /listings, on success navigate to listing detail
```
All steps show progress indicator (Step X of 5). Back navigation between steps preserves form state.

#### NegotiationScreen.js
- Timeline of all offers: each item shows role badge (Buyer/Seller), price formatted as PKR X,XXX, message, time, status badge
- If status = 'pending' and user is the recipient: show Accept / Reject buttons inline
- Bottom form: Price (PKR) input + Message input + "Send Offer" button
- Status cannot be 'finalized' or later: show "Deal Finalized" banner instead of form
- "Cancel Deal" button (red) â†’ confirmation modal â†’ reason input â†’ PATCH /transactions/:id/cancel
- "Open Dispute" button appears when status = 'finalized' or 'completed'
- "View Bond" button appears when status = 'finalized' | 'completed' | 'disputed'
- "Mark as Completed" (seller only, when status = 'finalized')

#### WalletScreen.js (Pro)
- Balance: large PKR display, formatted as "PKR 1,250.00"
- "Add Money" button (navigates to RechargeScreen)
- "Withdraw" button (navigates to WithdrawScreen)
- Ledger FlatList: type icon (â†‘ green credit / â†“ red debit), description, amount, balance after, date

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
- Actual weight input at 'collected' step â€” warning if discrepancy > 10%

#### AnalyticsScreen.js (Pro)
- Requires active Pro or Enterprise subscription â€” show upgrade prompt if not
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
Use t('key') from useTranslation() â€” never hardcode strings in JSX.
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

Other tabs: back press â†’ navigate to Home tab (not exit).

### 3.7 Offline handling (`components/NetworkBanner.js`)

```javascript
// useNetworkStatus() hook using NetInfo
// If !isConnected: render persistent red banner at top: "No internet connection"
// In Axios interceptor: if error.message === 'Network Error': throw readable message
// Never crash on network error â€” always show toast or inline message
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

## PART 4 â€” ADMIN PORTAL (Next.js 14)

### 4.1 Project structure

```
portal/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/                       â† Next.js App Router pages
â”‚   â”‚   â”œâ”€â”€ (auth)/
â”‚   â”‚   â”‚   â””â”€â”€ login/page.tsx
â”‚   â”‚   â””â”€â”€ (dashboard)/
â”‚   â”‚       â”œâ”€â”€ layout.tsx         â† sidebar + header shell
â”‚   â”‚       â”œâ”€â”€ page.tsx           â† /dashboard
â”‚   â”‚       â”œâ”€â”€ users/
â”‚   â”‚       â”‚   â”œâ”€â”€ page.tsx       â† user list
â”‚   â”‚       â”‚   â””â”€â”€ [id]/page.tsx  â† user detail
â”‚   â”‚       â”œâ”€â”€ kyc/page.tsx
â”‚   â”‚       â”œâ”€â”€ listings/page.tsx
â”‚   â”‚       â”œâ”€â”€ transactions/
â”‚   â”‚       â”‚   â”œâ”€â”€ page.tsx
â”‚   â”‚       â”‚   â””â”€â”€ [id]/page.tsx
â”‚   â”‚       â”œâ”€â”€ disputes/page.tsx
â”‚   â”‚       â”œâ”€â”€ collections/page.tsx
â”‚   â”‚       â”œâ”€â”€ finance/page.tsx
â”‚   â”‚       â”œâ”€â”€ territories/page.tsx
â”‚   â”‚       â”œâ”€â”€ subscriptions/page.tsx
â”‚   â”‚       â”œâ”€â”€ notifications/page.tsx
â”‚   â”‚       â”œâ”€â”€ analytics/page.tsx
â”‚   â”‚       â”œâ”€â”€ settings/page.tsx
â”‚   â”‚       â””â”€â”€ audit-log/page.tsx
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ layout/
â”‚   â”‚   â”‚   â”œâ”€â”€ Sidebar.tsx        â† nav links, role-aware visibility
â”‚   â”‚   â”‚   â”œâ”€â”€ Header.tsx         â† admin name, logout
â”‚   â”‚   â”‚   â””â”€â”€ PageHeader.tsx     â† title + breadcrumb
â”‚   â”‚   â”œâ”€â”€ ui/                    â† shadcn/ui components
â”‚   â”‚   â”œâ”€â”€ tables/
â”‚   â”‚   â”‚   â”œâ”€â”€ DataTable.tsx      â† reusable TanStack Table wrapper
â”‚   â”‚   â”‚   â””â”€â”€ Pagination.tsx
â”‚   â”‚   â”œâ”€â”€ modals/
â”‚   â”‚   â”‚   â”œâ”€â”€ KYCReviewModal.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ UserDetailModal.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ SuspendUserModal.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ResolveDisputeModal.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ManualWalletModal.tsx
â”‚   â”‚   â”‚   â””â”€â”€ AssignTerritoryModal.tsx
â”‚   â”‚   â”œâ”€â”€ cards/
â”‚   â”‚   â”‚   â”œâ”€â”€ KpiCard.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ActivityCard.tsx
â”‚   â”‚   â””â”€â”€ charts/
â”‚   â”‚       â”œâ”€â”€ GmvLineChart.tsx   â† Recharts
â”‚   â”‚       â””â”€â”€ CategoryBarChart.tsx
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ api.ts                 â† Axios instance (baseURL from env, attach cookie token)
â”‚   â”‚   â”œâ”€â”€ auth.ts                â† getServerSideToken, requireAdmin server util
â”‚   â”‚   â””â”€â”€ utils.ts               â† formatPKR, formatDate, cn()
â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”œâ”€â”€ useAdminUser.ts
â”‚   â”‚   â””â”€â”€ useSettings.ts
â”‚   â””â”€â”€ types/
â”‚       â””â”€â”€ index.ts               â† shared TypeScript interfaces
â”œâ”€â”€ .env.local.example
â””â”€â”€ package.json
```

### 4.2 Portal environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=Kabariya Admin
JWT_COOKIE_NAME=kabariya_admin_token
```

### 4.3 Authentication flow (portal)

- `/login` page: email + password form â†’ POST `/api/v1/auth/admin-login`
- On success: store `accessToken` in httpOnly cookie (set via Next.js route handler)
- Middleware (`middleware.ts`): protect all `/dashboard/*` routes â€” redirect to `/login` if no valid cookie
- All Axios requests attach the token from cookie automatically
- Logout: clear cookie â†’ redirect to `/login`

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
- Export CSV button â†’ GET /admin/users?format=csv

#### /users/[id]
- Profile card: avatar initial, name, phone, email, role badge, city, status badge
- Stats row: Active Listings, Total Deals, Wallet Balance (PKR), Rating
- KYC Documents section: each doc as clickable thumbnail â†’ opens in modal lightbox (signed S3 URL)
- CNIC number displayed (decrypted) for approved/reviewing admins only
- Subscription card: plan name, expires, status
- Wallet card: balance + "Manual Adjust" button â†’ ManualWalletModal
- Recent transactions table (5 rows)
- Danger Zone: Suspend / Unsuspend / Ban / Change Role buttons
- All actions log to audit_log

#### /kyc
- 3 tabs: Pending (sorted oldest first), Approved, Rejected
- Each row: user name, phone, role, city, submitted date, days waiting
- "Review" button â†’ KYCReviewModal (full-screen side panel):
  - Left panel: CNIC number (decrypted), and 6 document images/PDFs in a scrollable grid
  - Each document labelled (CNIC Front, CNIC Back, SIM, Selfie, Warehouse, Police Cert)
  - Click image â†’ full-screen lightbox
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
- Row click â†’ /transactions/[id]

#### /transactions/[id]
- Two-column: listing card (left) + status timeline (right)
- Buyer and seller cards with quick-action links (view profile)
- Offer history timeline: price chip, message, sender badge, timestamp, status badge
- "View Bond" button â†’ signed PDF URL in new tab
- Admin status override dropdown
- "Open Dispute" button if not already disputed

#### /disputes
- Open disputes queue (default view), filter to Resolved
- Columns: Transaction ID, Raised By, Other Party, Listing, Amount, Days Open, Actions
- Days Open > 3: red cell highlight
- "Resolve" button â†’ ResolveDisputeModal:
  - Full transaction context summary
  - Radio: Award to Buyer / Award to Seller / Mutual Cancellation
  - Resolution note (required, min 20 chars)
  - Confirm â†’ PATCH /admin/disputes/:id/resolve â†’ optimistic UI update

#### /collections
- Table with status filter + "Overdue only" toggle
- Overdue rows: red background
- Columns: Job ID, Listing, Dealer, Seller City, Status badge, SLA Deadline, Created, Actions
- "Assign" button â†’ dealer search modal â†’ POST /admin/collections/:id/assign
- "View Proof" inline if proof_photo_url exists

#### /finance
- Summary KPI cards: Total Dealer Wallets, Commission This Month, Pending Withdrawals (count + PKR total)
- Tabs:
  - **Pending Withdrawals**: table with bank details â€” Approve / Reject buttons per row
  - **Manual Adjustments**: form (user search autocomplete, Credit/Debit toggle, amount PKR, required note) + recent adjustments table

#### /territories
- Territory list: expandable rows showing assigned dealers
- "New Territory" button â†’ form modal
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
- "Save Settings" button â†’ PATCH /admin/settings
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
  â””â”€ All Users
  â””â”€ KYC Queue  (badge: pending count)
Listings
  â””â”€ All Listings
  â””â”€ Flagged  (badge: count)
Transactions
  â””â”€ All Transactions
  â””â”€ Disputes  (badge: open count)
Collections  (badge: overdue count)
Finance
  â””â”€ Wallet Management
  â””â”€ Withdrawals  (badge: pending count)
Territories
Subscriptions
Notifications
Analytics
Settings
Audit Log
```

Super Admin only sees: Settings, Audit Log (admin role sees all others except system-level settings).

---

## PART 5 â€” CROSS-CUTTING REQUIREMENTS

### 5.1 Security

- All endpoints (except `/auth/*`, `/payments/webhook/*`, `/config/app-version`, GET `/listings`, GET `/categories`, GET `/territories`) require `verifyToken` middleware
- Admin portal routes require `requireRole('admin', 'super_admin')`
- HTTPS enforced in production via reverse proxy (document in README: use nginx or Caddy)
- `helmet()` applied as first middleware â€” sets CSP, X-Frame-Options, HSTS, etc.
- CORS: allow `FRONTEND_ORIGINS` env var (comma-separated) for browser clients; mobile clients are exempt from CORS
- All SQL queries use Knex parameterised queries â€” no raw string interpolation
- CNIC numbers encrypted with AES-256-GCM before DB insert; decrypted only on explicit admin KYC review request
- KYC document S3 bucket has `Block Public Access = ON`; all access via signed URLs only
- Passwords (admin accounts) hashed with bcrypt saltRounds=12
- JWT secrets minimum 64 characters, loaded from environment â€” never hardcoded
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

- DB indexes: defined in schema section above â€” all foreign keys, all status columns, all created_at columns used in range queries
- Redis cache for `system_settings` (key: `cache:system_settings`, TTL 5 min, invalidate on PATCH /admin/settings)
- Redis cache for `categories` list (key: `cache:categories`, TTL 1 hour)
- Listings endpoint: never return more than 50 per page
- Images in React Native: always use `OptimizedImage` (FastImage) â€” never `Image` from RN core
- FlatList: always set `keyExtractor`, `getItemLayout` (where row height is fixed), `initialNumToRender=10`, `maxToRenderPerBatch=10`
- Chat messages: paginate 30 per page, newest last, load more on scroll to top
- Socket.io: use Redis adapter (`@socket.io/redis-adapter`) for horizontal scaling readiness

### 5.4 Error handling

- Express: global error handler middleware catches all unhandled errors, returns JSON `{ success:false, message, code, stack(dev only) }`
- React Native: `ErrorBoundary` component wraps the entire app, calls `crashlytics().recordError()`
- Unhandled promise rejections in Node: `process.on('unhandledRejection')` â€” log to console.error and alert monitoring (do not crash process in production)
- All async controller functions wrapped in `asyncHandler` middleware (wraps with try/catch, passes to next(err))

### 5.5 Monitoring & observability

- `GET /health` â†’ `{ status: 'ok', uptime, timestamp, db: 'connected'|'error' }` â€” no auth required
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
| Concurrent users | Design for 1,000 concurrent â€” use connection pooling (pg pool max=20) |
| Offline behaviour | App shows NetworkBanner, shows cached screen content, no crash |
| Locales | English (LTR) + Urdu (RTL) â€” all strings in i18n files, no hardcoded text |
| RTL | All icons, navigation arrows, and layouts mirror on I18nManager.isRTL |
| App not crash on | Rotate, background/foreground switch, network loss, server error |
| Back button (Android) | Home: double-press to exit with 2s window. Other tabs: go to Home |
| Deep links | All notification types route to correct screen (background + quit state) |
| Token storage | Keychain (iOS) / EncryptedSharedPreferences (Android) â€” never AsyncStorage |
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

## PART 6 â€” SEED DATA & INITIAL STATE

After running `npx knex migrate:latest && npx knex seed:run`, the system should have:

1. **Admin user**: `admin@kabariya.pk` / `Admin123!` with role `super_admin`
2. **system_settings**: all 11 rows as defined in Part 1
3. **app_versions**: android + ios rows
4. **subscription_plans**: Basic (free), Pro (PKR 999), Enterprise (PKR 2999)
5. **categories**: 9 top-level + subcategories for Metals, Plastics, Electronics
6. **Demo territories**: Karachi Central, Karachi East, Karachi West, Lahore, Islamabad
7. **Test users** (development only):
   - `03001111111` â€” customer
   - `03002222222` â€” local_dealer (KYC pending)
   - `03003333333` â€” local_dealer (KYC approved, wallet_balance=100000)
   - `03004444444` â€” city_franchise (KYC approved)
   - All test OTPs: `111111`

---

## PART 7 â€” README REQUIREMENTS

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
- [ ] Tokens stored in Keychain â€” NOT AsyncStorage
- [ ] Force update screen shown for old app version, non-dismissible
- [ ] Refresh token rotation works (old token invalidated on use)

### KYC
- [ ] CNIC `12345-1234567-1` validates; `ABC1234567890` fails
- [ ] CNIC stored encrypted in DB â€” raw plaintext never in any column
- [ ] KYC doc URLs require signed S3 URL to view â€” not publicly accessible
- [ ] Rejected KYC shows admin reason in app
- [ ] Approved dealer with zero balance always lands on BalanceGateScreen

### Listings
- [ ] GET /listings?q=copper&city=Karachi returns filtered results
- [ ] Pro dealer only sees listings in assigned territories
- [ ] 5th report auto-flags the listing
- [ ] Listing older than `listing_expiry_days` auto-expires via cron

### Chat
- [ ] Messages appear in < 1s (WebSocket â€” not polling)
- [ ] Blocked sender's message rejected server-side
- [ ] Image messages render in chat bubbles
- [ ] Unread count badge updates in real-time

### Wallet & Payments
- [ ] Webhook with invalid HMAC returns 400
- [ ] Duplicate webhook is idempotent
- [ ] Balance stored as integer paisa â€” no floats anywhere
- [ ] Commission deducted on finalization
- [ ] Wallet never goes negative

### Collections
- [ ] Deal finalization auto-creates collection_jobs row
- [ ] Proof photo required before collectedâ†’delivered transition
- [ ] SLA cron reassigns unaccepted jobs every 5 min

### Admin Portal
- [ ] Admin login with wrong password: 401
- [ ] Non-admin JWT rejected from /admin/* routes
- [ ] KYC approval triggers push + updates dealer status in-app
- [ ] Suspend user â†’ that user gets 403 on next API call
- [ ] Dispute resolution notifies both parties

### General
- [ ] Offline state: NetworkBanner shown, no crash
- [ ] RTL: all screens mirror in Urdu mode
- [ ] Back button: Home double-press exit, other tabs go to Home
- [ ] All notification taps deep-link to correct screen
- [ ] GET /health returns 200 with `status: ok`
- [ ] All monetary values in paisa â€” format as PKR X,XXX.XX in UI only

---

*End of Kabariya Complete System Specification â€” v1.0 â€” March 2026*
*This document is the single source of truth. Any deviation requires updating this file first.*

---

## 19. Android AVD / Flutter Prompt

*(Full content of docs/prompts/android_avd_prompt.md is included in this consolidated file below.)*

---

## 20. Cursor Master Development Prompt

*(Full content of docs/prompts/cursor_prompt.md is included in this consolidated file below.)*

# ðŸ¤– CursorAI Prompt â€” Flutter Android App
## Geo-Franchise Marketplace | Pakistan Edition | AVD-Ready Build

---

## ðŸŽ¯ OBJECTIVE

Build a **fully functional Flutter Android application** that can be compiled and installed on an **Android Virtual Device (AVD)** using Android Studio or VS Code. The app must run on **Android API 24+** (Android 7.0 Nougat and above). This is Phase 1 of the mobile app â€” a **working prototype with mock data** that demonstrates all screens and flows before connecting to the real backend.

---

## âœ… PRE-REQUISITES (Verify before starting)

Before writing any code, confirm and set up the following:

```bash
# 1. Check Flutter is installed and healthy
flutter doctor -v
# Required: Flutter SDK â‰¥ 3.16, Dart â‰¥ 3.2
# Required: Android toolchain âœ“
# Required: Android Studio âœ“ OR VS Code with Flutter extension

# 2. Check AVD exists (or create one)
# Open Android Studio â†’ Device Manager â†’ Create Virtual Device
# Recommended AVD: Pixel 6 Pro, API 33 (Android 13), x86_64
# Min supported: Pixel 4, API 24 (Android 7)

# 3. Start AVD
# Android Studio: Device Manager â†’ Play â–¶
# OR via terminal:
emulator -avd Pixel_6_Pro_API_33

# 4. Verify device visible to Flutter
flutter devices
# Should show: emulator-5554 â€¢ Android SDK Built for x86 64 â€¢ android-x86

# 5. Run app on AVD
flutter run -d emulator-5554
```

---

## ðŸ“ PROJECT STRUCTURE (Create Exactly This)

```
/marketplace_app
â”œâ”€â”€ android/                        â† Android native configs
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ build.gradle            â† minSdk 24, targetSdk 34
â”‚   â”‚   â”œâ”€â”€ src/main/
â”‚   â”‚   â”‚   â”œâ”€â”€ AndroidManifest.xml â† Permissions
â”‚   â”‚   â”‚   â””â”€â”€ res/
â”‚   â”‚   â”‚       â”œâ”€â”€ mipmap-*/       â† App icons
â”‚   â”‚   â”‚       â””â”€â”€ values/
â”‚   â”‚   â”‚           â””â”€â”€ styles.xml  â† Splash screen
â”‚   â””â”€â”€ build.gradle
â”œâ”€â”€ assets/
â”‚   â”œâ”€â”€ fonts/
â”‚   â”‚   â”œâ”€â”€ Inter-Regular.ttf
â”‚   â”‚   â”œâ”€â”€ Inter-Medium.ttf
â”‚   â”‚   â”œâ”€â”€ Inter-SemiBold.ttf
â”‚   â”‚   â”œâ”€â”€ Inter-Bold.ttf
â”‚   â”‚   â””â”€â”€ JameelNooriNastaleeq.ttf  â† Urdu font
â”‚   â”œâ”€â”€ images/
â”‚   â”‚   â”œâ”€â”€ logo.png
â”‚   â”‚   â”œâ”€â”€ logo_white.png
â”‚   â”‚   â”œâ”€â”€ onboarding_1.png
â”‚   â”‚   â”œâ”€â”€ onboarding_2.png
â”‚   â”‚   â””â”€â”€ onboarding_3.png
â”‚   â”œâ”€â”€ animations/
â”‚   â”‚   â”œâ”€â”€ splash_lottie.json
â”‚   â”‚   â”œâ”€â”€ success_lottie.json
â”‚   â”‚   â””â”€â”€ empty_state.json
â”‚   â””â”€â”€ translations/
â”‚       â”œâ”€â”€ en.json
â”‚       â””â”€â”€ ur.json
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ main.dart
â”‚   â”œâ”€â”€ core/
â”‚   â”‚   â”œâ”€â”€ theme/
â”‚   â”‚   â”‚   â”œâ”€â”€ app_theme.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ app_colors.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ app_typography.dart
â”‚   â”‚   â”‚   â””â”€â”€ app_spacing.dart
â”‚   â”‚   â”œâ”€â”€ router/
â”‚   â”‚   â”‚   â””â”€â”€ app_router.dart
â”‚   â”‚   â”œâ”€â”€ mock/
â”‚   â”‚   â”‚   â”œâ”€â”€ mock_data.dart        â† All mock data
â”‚   â”‚   â”‚   â””â”€â”€ mock_service.dart     â† Simulated API delay
â”‚   â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â”‚   â”œâ”€â”€ user.model.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ listing.model.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ category.model.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ transaction.model.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ notification.model.dart
â”‚   â”‚   â”‚   â””â”€â”€ subscription.model.dart
â”‚   â”‚   â”œâ”€â”€ providers/
â”‚   â”‚   â”‚   â”œâ”€â”€ auth.provider.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ listing.provider.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ category.provider.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ transaction.provider.dart
â”‚   â”‚   â”‚   â”œâ”€â”€ notification.provider.dart
â”‚   â”‚   â”‚   â””â”€â”€ locale.provider.dart
â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”‚       â”œâ”€â”€ currency.util.dart
â”‚   â”‚       â”œâ”€â”€ date.util.dart
â”‚   â”‚       â”œâ”€â”€ validators.util.dart
â”‚   â”‚       â””â”€â”€ pk_cities.dart
â”‚   â””â”€â”€ features/
â”‚       â”œâ”€â”€ splash/
â”‚       â”‚   â””â”€â”€ splash_screen.dart
â”‚       â”œâ”€â”€ onboarding/
â”‚       â”‚   â””â”€â”€ onboarding_screen.dart
â”‚       â”œâ”€â”€ auth/
â”‚       â”‚   â”œâ”€â”€ login_screen.dart
â”‚       â”‚   â”œâ”€â”€ register_screen.dart
â”‚       â”‚   â”œâ”€â”€ otp_screen.dart
â”‚       â”‚   â””â”€â”€ kyc_screen.dart
â”‚       â”œâ”€â”€ home/
â”‚       â”‚   â”œâ”€â”€ home_screen.dart
â”‚       â”‚   â””â”€â”€ widgets/
â”‚       â”‚       â”œâ”€â”€ category_grid.dart
â”‚       â”‚       â”œâ”€â”€ recent_listings.dart
â”‚       â”‚       â””â”€â”€ stats_banner.dart
â”‚       â”œâ”€â”€ listings/
â”‚       â”‚   â”œâ”€â”€ browse_listings_screen.dart
â”‚       â”‚   â”œâ”€â”€ listing_detail_screen.dart
â”‚       â”‚   â”œâ”€â”€ create_listing/
â”‚       â”‚   â”‚   â”œâ”€â”€ create_listing_screen.dart
â”‚       â”‚   â”‚   â”œâ”€â”€ step1_category.dart
â”‚       â”‚   â”‚   â”œâ”€â”€ step2_photos.dart
â”‚       â”‚   â”‚   â”œâ”€â”€ step3_details.dart
â”‚       â”‚   â”‚   â”œâ”€â”€ step4_location.dart
â”‚       â”‚   â”‚   â””â”€â”€ step5_preview.dart
â”‚       â”‚   â”œâ”€â”€ my_listings_screen.dart
â”‚       â”‚   â””â”€â”€ widgets/
â”‚       â”‚       â”œâ”€â”€ listing_card.dart
â”‚       â”‚       â”œâ”€â”€ listing_map_view.dart
â”‚       â”‚       â”œâ”€â”€ price_badge.dart
â”‚       â”‚       â””â”€â”€ visibility_badge.dart
â”‚       â”œâ”€â”€ transactions/
â”‚       â”‚   â”œâ”€â”€ transactions_screen.dart
â”‚       â”‚   â”œâ”€â”€ transaction_detail_screen.dart
â”‚       â”‚   â”œâ”€â”€ negotiation_screen.dart
â”‚       â”‚   â””â”€â”€ bond_viewer_screen.dart
â”‚       â”œâ”€â”€ chat/
â”‚       â”‚   â”œâ”€â”€ chat_screen.dart
â”‚       â”‚   â””â”€â”€ widgets/
â”‚       â”‚       â”œâ”€â”€ message_bubble.dart
â”‚       â”‚       â””â”€â”€ offer_card.dart
â”‚       â”œâ”€â”€ notifications/
â”‚       â”‚   â””â”€â”€ notifications_screen.dart
â”‚       â”œâ”€â”€ subscription/
â”‚       â”‚   â”œâ”€â”€ subscription_screen.dart
â”‚       â”‚   â”œâ”€â”€ plans_screen.dart
â”‚       â”‚   â””â”€â”€ payment_screen.dart
â”‚       â”œâ”€â”€ wallet/
â”‚       â”‚   â”œâ”€â”€ wallet_screen.dart
â”‚       â”‚   â””â”€â”€ recharge_screen.dart
â”‚       â”œâ”€â”€ analytics/
â”‚       â”‚   â””â”€â”€ analytics_screen.dart
â”‚       â”œâ”€â”€ profile/
â”‚       â”‚   â”œâ”€â”€ profile_screen.dart
â”‚       â”‚   â””â”€â”€ edit_profile_screen.dart
â”‚       â””â”€â”€ settings/
â”‚           â””â”€â”€ settings_screen.dart
â”œâ”€â”€ pubspec.yaml
â””â”€â”€ README.md
```

---

## ðŸ“¦ PUBSPEC.YAML (Complete â€” Copy Exactly)

```yaml
name: marketplace_app
description: Geo-Franchise Marketplace - Pakistan Edition
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: ">=3.16.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.4.9
  riverpod_annotation: ^2.3.3

  # Navigation
  go_router: ^13.2.0

  # UI Components
  google_fonts: ^6.1.0
  shimmer: ^3.0.0
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.9
  lottie: ^3.1.0
  dotted_border: ^2.1.0
  badges: ^3.1.2
  smooth_page_indicator: ^1.1.0
  step_progress_indicator: ^1.0.2
  pinput: ^3.0.1           # OTP input
  photo_view: ^0.14.0

  # Forms & Validation
  reactive_forms: ^17.0.0
  image_picker: ^1.0.7
  image_cropper: ^5.0.1
  file_picker: ^6.1.1

  # Maps & Location
  google_maps_flutter: ^2.5.3
  geolocator: ^11.0.0
  geocoding: ^3.0.0

  # Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2

  # Networking (mock-ready, backend-ready)
  dio: ^5.4.1
  pretty_dio_logger: ^1.3.1

  # Localization
  easy_localization: ^3.0.3
  intl: ^0.19.0

  # Charts
  fl_chart: ^0.66.2
  syncfusion_flutter_charts: ^24.1.41

  # PDF Viewer
  syncfusion_flutter_pdfviewer: ^24.1.41

  # Utilities
  uuid: ^4.3.3
  timeago: ^3.6.0
  url_launcher: ^6.2.4
  share_plus: ^7.2.2
  permission_handler: ^11.3.0
  connectivity_plus: ^6.0.2
  package_info_plus: ^5.0.1
  device_info_plus: ^10.1.0
  flutter_animate: ^4.5.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.8
  riverpod_generator: ^2.3.9
  flutter_gen_runner: ^5.4.0

flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/animations/
    - assets/translations/

  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
    - family: JameelNooriNastaleeq
      fonts:
        - asset: assets/fonts/JameelNooriNastaleeq.ttf
```

---

## ðŸ¤– ANDROID NATIVE CONFIGURATION

### `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34
    ndkVersion flutter.ndkVersion

    defaultConfig {
        applicationId "com.marketplace.pk"
        minSdkVersion 24          // Android 7.0 â€” AVD compatible
        targetSdkVersion 34
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
        multiDexEnabled true
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug  // debug signing for AVD testing
            minifyEnabled false
            shrinkResources false
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.multidex:multidex:2.0.1'
}
```

### `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32"/>
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="28"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

    <application
        android:label="Ù…Ø§Ø±Ú©ÛŒÙ¹ Ù¾Ù„ÛŒØ³"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme"/>
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="YOUR_GOOGLE_MAPS_API_KEY"/>

    </application>
</manifest>
```

---

## ðŸŽ¨ THEME & DESIGN SYSTEM

### `lib/core/theme/app_colors.dart`:

```dart
class AppColors {
  // Primary â€” Green (recycling/eco theme)
  static const primary = Color(0xFF16A34A);
  static const primaryDark = Color(0xFF15803D);
  static const primaryLight = Color(0xFFDCFCE7);

  // Secondary â€” Amber (market/trade theme)
  static const secondary = Color(0xFFF59E0B);
  static const secondaryDark = Color(0xFFD97706);
  static const secondaryLight = Color(0xFFFEF3C7);

  // Neutrals
  static const background = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceVariant = Color(0xFFF1F5F9);
  static const border = Color(0xFFE2E8F0);
  static const divider = Color(0xFFF1F5F9);

  // Text
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textMuted = Color(0xFF94A3B8);
  static const textInverse = Color(0xFFFFFFFF);

  // Status
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFDC2626);
  static const info = Color(0xFF2563EB);

  // Visibility Level Colors
  static const visibilityLocal = Color(0xFF16A34A);
  static const visibilityNeighbor = Color(0xFF2563EB);
  static const visibilityCity = Color(0xFFF59E0B);
  static const visibilityWholesale = Color(0xFF7C3AED);
  static const visibilityPublic = Color(0xFFDC2626);

  // Role Colors
  static const roleCustomer = Color(0xFF64748B);
  static const roleDealer = Color(0xFF2563EB);
  static const roleFranchise = Color(0xFF7C3AED);
  static const roleWholesale = Color(0xFFDC2626);

  // Category Colors (matches backend seed)
  static const catMetals = Color(0xFFF59E0B);
  static const catPlastics = Color(0xFF3B82F6);
  static const catPaper = Color(0xFF10B981);
  static const catElectronics = Color(0xFF8B5CF6);
  static const catOrganic = Color(0xFFEF4444);
  static const catFurniture = Color(0xFFF97316);
  static const catHousehold = Color(0xFF06B6D4);
  static const catGlass = Color(0xFF64748B);
}
```

### `lib/core/theme/app_theme.dart`:

```dart
class AppTheme {
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    ),
    fontFamily: 'Inter',
    scaffoldBackgroundColor: AppColors.background,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.surface,
      elevation: 0,
      centerTitle: true,
      foregroundColor: AppColors.textPrimary,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
    ),
    cardTheme: CardTheme(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceVariant,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: AppColors.surface,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
  );
}
```

---

## ðŸ—„ï¸ MOCK DATA SYSTEM

### `lib/core/mock/mock_data.dart`:

```dart
// Complete mock data that drives the entire prototype
// When backend is ready, replace MockService calls with real Dio calls

class MockData {

  // â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static final users = {
    'customer': UserModel(
      id: 'u1', name: 'Ali Hassan', nameUrdu: 'Ø¹Ù„ÛŒ Ø­Ø³Ù†',
      phone: '+92 300-1234567', email: 'ali@example.com',
      role: UserRole.customer, city: 'Karachi',
      kycStatus: KycStatus.approved, languageCode: 'ur',
      subscriptionStatus: null,
    ),
    'dealer': UserModel(
      id: 'u2', name: 'Bilal Traders', nameUrdu: 'Ø¨Ù„Ø§Ù„ Ù¹Ø±ÛŒÚˆØ±Ø²',
      phone: '+92 321-9876543', email: 'bilal@example.com',
      role: UserRole.localDealer, city: 'Karachi',
      kycStatus: KycStatus.approved, languageCode: 'ur',
      zone: 'Korangi Industrial Area',
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionDaysLeft: 18,
    ),
    'franchise': UserModel(
      id: 'u3', name: 'City Franchise Karachi', nameUrdu: 'Ø³Ù¹ÛŒ ÙØ±Ù†Ú†Ø§Ø¦Ø² Ú©Ø±Ø§Ú†ÛŒ',
      phone: '+92 333-5551234', email: 'franchise@example.com',
      role: UserRole.cityFranchise, city: 'Karachi',
      kycStatus: KycStatus.approved, languageCode: 'ur',
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionDaysLeft: 25,
    ),
  };

  // â”€â”€ CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static final categories = [
    CategoryModel(id: 'c1', slug: 'metals', nameEn: 'Metals', nameUr: 'Ø¯Ú¾Ø§ØªÛŒÚº', colorHex: '#F59E0B', icon: 'âš™ï¸',
      subCategories: [
        SubCategoryModel(id: 'sc1', nameEn: 'Copper', nameUr: 'ØªØ§Ù†Ø¨Ø§', colorHex: '#F59E0B'),
        SubCategoryModel(id: 'sc2', nameEn: 'Iron', nameUr: 'Ù„ÙˆÛØ§', colorHex: '#6B7280'),
        SubCategoryModel(id: 'sc3', nameEn: 'Silver', nameUr: 'Ú†Ø§Ù†Ø¯ÛŒ', colorHex: '#9CA3AF'),
      ]
    ),
    CategoryModel(id: 'c2', slug: 'plastics', nameEn: 'Plastics', nameUr: 'Ù¾Ù„Ø§Ø³Ù¹Ú©', colorHex: '#3B82F6', icon: 'ðŸ§´'),
    CategoryModel(id: 'c3', slug: 'paper', nameEn: 'Paper & Cardboard', nameUr: 'Ú©Ø§ØºØ° Ø§ÙˆØ± Ú¯ØªÛ', colorHex: '#10B981', icon: 'ðŸ“¦'),
    CategoryModel(id: 'c4', slug: 'electronics', nameEn: 'Electronics', nameUr: 'Ø§Ù„ÛŒÚ©Ù¹Ø±Ø§Ù†Ú©Ø³', colorHex: '#8B5CF6', icon: 'ðŸ”Œ'),
    CategoryModel(id: 'c5', slug: 'organic', nameEn: 'Organic', nameUr: 'Ù†Ø§Ù…ÛŒØ§ØªÛŒ', colorHex: '#EF4444', icon: 'ðŸ¦´'),
    CategoryModel(id: 'c6', slug: 'furniture', nameEn: 'Furniture', nameUr: 'ÙØ±Ù†ÛŒÚ†Ø±', colorHex: '#F97316', icon: 'ðŸª‘'),
    CategoryModel(id: 'c7', slug: 'household', nameEn: 'Household', nameUr: 'Ú¯Ú¾Ø±ÛŒÙ„Ùˆ', colorHex: '#06B6D4', icon: 'ðŸ '),
    CategoryModel(id: 'c8', slug: 'glass', nameEn: 'Glass', nameUr: 'Ø´ÛŒØ´Û', colorHex: '#64748B', icon: 'ðŸªŸ'),
  ];

  // â”€â”€ LISTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static final listings = [
    ListingModel(
      id: 'l1', title: 'Copper Wire Scrap', titleUrdu: 'ØªØ§Ù†Ø¨Û’ Ú©ÛŒ ØªØ§Ø± Ú©Ø§ Ú©Ø¨Ø§Ú‘',
      description: '99% pure copper wire, collected from factory.', descUrdu: 'ÙÛŒÚ©Ù¹Ø±ÛŒ Ø³Û’ Ø¬Ù…Ø¹ Ú©ÛŒ Ú¯Ø¦ÛŒ ØªØ§Ù†Ø¨Û’ Ú©ÛŒ ØªØ§Ø±',
      pricePkr: 850, unit: 'kg', quantity: 200,
      categoryId: 'c1', categoryName: 'Metals', categoryNameUr: 'Ø¯Ú¾Ø§ØªÛŒÚº',
      sellerName: 'Ali Hassan', sellerPhone: '+92 300-1234567',
      city: 'Karachi', area: 'Korangi', latitude: 24.8607, longitude: 67.0011,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.local,
      images: ['https://picsum.photos/seed/copper/400/300'],
      daysAgo: 1, interestedCount: 2,
    ),
    ListingModel(
      id: 'l2', title: 'Iron Scrap Bulk', titleUrdu: 'Ù„ÙˆÛÛ’ Ú©Ø§ Ú©Ø¨Ø§Ú‘ Ø¨Ú‘ÛŒ Ù…Ù‚Ø¯Ø§Ø±',
      description: 'Mixed iron scrap from demolition site, 2 truck loads.', descUrdu: 'ØªÙˆÚ‘ Ù¾Ú¾ÙˆÚ‘ Ø³Ø§Ø¦Ù¹ Ø³Û’ Ù„ÙˆÛÛ’ Ú©Ø§ Ú©Ø¨Ø§Ú‘',
      pricePkr: 120, unit: 'kg', quantity: 5000,
      categoryId: 'c1', categoryName: 'Metals', categoryNameUr: 'Ø¯Ú¾Ø§ØªÛŒÚº',
      sellerName: 'Zain Construction', sellerPhone: '+92 321-7654321',
      city: 'Karachi', area: 'SITE Industrial Area', latitude: 24.9056, longitude: 67.0215,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.wholesale,
      images: ['https://picsum.photos/seed/iron/400/300'],
      daysAgo: 2, interestedCount: 8,
    ),
    ListingModel(
      id: 'l3', title: 'Electronic Scrap Mix', titleUrdu: 'Ø§Ù„ÛŒÚ©Ù¹Ø±Ø§Ù†Ú© Ú©Ø¨Ø§Ú‘ Ù…Ú©Ø³',
      description: 'Old computers, PCBs, cables from office clearance.',
      pricePkr: 300, unit: 'kg', quantity: 150,
      categoryId: 'c4', categoryName: 'Electronics', categoryNameUr: 'Ø§Ù„ÛŒÚ©Ù¹Ø±Ø§Ù†Ú©Ø³',
      sellerName: 'Raza Office Solutions', sellerPhone: '+92 333-1122334',
      city: 'Lahore', area: 'Gulberg', latitude: 31.5204, longitude: 74.3587,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.city,
      images: ['https://picsum.photos/seed/electronics/400/300'],
      daysAgo: 5, interestedCount: 4,
    ),
    ListingModel(
      id: 'l4', title: 'Paper Waste - Office Ream', titleUrdu: 'Ø¯ÙØªØ±ÛŒ Ø±Ø¯ÛŒ Ú©Ø§ØºØ°',
      description: 'Clean white paper waste, well sorted.',
      pricePkr: 45, unit: 'kg', quantity: 800,
      categoryId: 'c3', categoryName: 'Paper', categoryNameUr: 'Ú©Ø§ØºØ°',
      sellerName: 'National Bank Branch', sellerPhone: '+92 300-9988776',
      city: 'Islamabad', area: 'Blue Area', latitude: 33.7294, longitude: 73.0931,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.neighbor,
      images: ['https://picsum.photos/seed/paper/400/300'],
      daysAgo: 3, interestedCount: 1,
    ),
    ListingModel(
      id: 'l5', title: 'Plastic Bottles PET', titleUrdu: 'Ù¾ÛŒ Ø§ÛŒ Ù¹ÛŒ Ù¾Ù„Ø§Ø³Ù¹Ú© Ø¨ÙˆØªÙ„ÛŒÚº',
      description: 'Crushed PET plastic bottles, ready for recycling.',
      pricePkr: 75, unit: 'kg', quantity: 300,
      categoryId: 'c2', categoryName: 'Plastics', categoryNameUr: 'Ù¾Ù„Ø§Ø³Ù¹Ú©',
      sellerName: 'Soft Drink Factory', sellerPhone: '+92 321-3344556',
      city: 'Faisalabad', area: 'Industrial Estate', latitude: 31.4504, longitude: 73.1350,
      status: ListingStatus.underNegotiation, visibilityLevel: VisibilityLevel.local,
      images: ['https://picsum.photos/seed/plastic/400/300'],
      daysAgo: 7, interestedCount: 6,
    ),
  ];

  // â”€â”€ TRANSACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static final transactions = [
    TransactionModel(
      id: 't1', listingId: 'l1', listingTitle: 'Copper Wire Scrap',
      buyerName: 'Bilal Traders', sellerName: 'Ali Hassan',
      offeredPricePkr: 820, finalPricePkr: 840, quantity: 200, unit: 'kg',
      status: TransactionStatus.finalized, totalPkr: 168000,
      createdAt: DateTime.now().subtract(Duration(days: 2)),
    ),
    TransactionModel(
      id: 't2', listingId: 'l3', listingTitle: 'Electronic Scrap Mix',
      buyerName: 'City Franchise Karachi', sellerName: 'Raza Office Solutions',
      offeredPricePkr: 280, finalPricePkr: null, quantity: 150, unit: 'kg',
      status: TransactionStatus.negotiating, totalPkr: 42000,
      createdAt: DateTime.now().subtract(Duration(hours: 5)),
    ),
  ];

  // â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static final notifications = [
    NotificationModel(id: 'n1', title: 'New listing in your zone', titleUr: 'Ø¢Ù¾ Ú©Û’ Ø¹Ù„Ø§Ù‚Û’ Ù…ÛŒÚº Ù†Ø¦ÛŒ ÙÛØ±Ø³Øª',
      body: 'Copper Wire Scrap - 200kg added in Korangi', bodyUr: 'Ú©ÙˆÚ‘Ù†Ú¯ÛŒ Ù…ÛŒÚº ØªØ§Ù†Ø¨Û’ Ú©ÛŒ ØªØ§Ø± Ú©Ø§ Ú©Ø¨Ø§Ú‘ Ø´Ø§Ù…Ù„ ÛÙˆØ§',
      type: 'new_listing', isRead: false, createdAt: DateTime.now().subtract(Duration(hours: 1))),
    NotificationModel(id: 'n2', title: 'Offer received', titleUr: 'Ù¾ÛŒØ´Ú©Ø´ Ù…Ù„ÛŒ',
      body: 'Bilal Traders offered â‚¨820/kg for your Copper Wire', bodyUr: 'Ø¨Ù„Ø§Ù„ Ù¹Ø±ÛŒÚˆØ±Ø² Ù†Û’ ØªØ§Ù†Ø¨Û’ Ú©ÛŒ ØªØ§Ø± Ú©Û’ Ù„ÛŒÛ’ â‚¨820 ÙÛŒ Ú©Ù„Ùˆ Ù¾ÛŒØ´Ú©Ø´ Ú©ÛŒ',
      type: 'offer', isRead: false, createdAt: DateTime.now().subtract(Duration(hours: 3))),
    NotificationModel(id: 'n3', title: 'Subscription expiring', titleUr: 'Ø³Ø¨Ø³Ú©Ø±Ù¾Ø´Ù† Ø®ØªÙ… ÛÙˆÙ†Û’ ÙˆØ§Ù„ÛŒ ÛÛ’',
      body: 'Your plan expires in 3 days. Renew now.', bodyUr: 'Ø¢Ù¾ Ú©ÛŒ Ø³Ø¨Ø³Ú©Ø±Ù¾Ø´Ù† 3 Ø¯Ù† Ù…ÛŒÚº Ø®ØªÙ… ÛÙˆÚ¯ÛŒÛ” Ø§Ø¨Ú¾ÛŒ ØªØ¬Ø¯ÛŒØ¯ Ú©Ø±ÛŒÚº',
      type: 'subscription', isRead: true, createdAt: DateTime.now().subtract(Duration(days: 1))),
  ];

  // â”€â”€ SUBSCRIPTION PLANS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static final subscriptionPlans = [
    SubscriptionPlanModel(id: 'sp1', name: 'Local Dealer Weekly', nameUr: 'Ù„ÙˆÚ©Ù„ ÚˆÛŒÙ„Ø± ÛÙØªÛ ÙˆØ§Ø±',
      role: 'local_dealer', priceWeekly: 500, priceMonthly: 1500,
      features: ['Zone listings access', 'Deal finalization', 'Digital bonds'],
      featuresUr: ['Ø¹Ù„Ø§Ù‚Û’ Ú©ÛŒ ÙÛØ±Ø³ØªÛŒÚº', 'ÚˆÛŒÙ„ Ù…Ú©Ù…Ù„ Ú©Ø±ÛŒÚº', 'ÚˆÛŒØ¬ÛŒÙ¹Ù„ Ø¨Ø§Ù†Úˆ'],
    ),
    SubscriptionPlanModel(id: 'sp2', name: 'Franchise Monthly', nameUr: 'ÙØ±Ù†Ú†Ø§Ø¦Ø² Ù…Ø§ÛØ§Ù†Û',
      role: 'city_franchise', priceWeekly: 1500, priceMonthly: 4500,
      features: ['Multi-zone access', 'Escalated listings', 'Analytics dashboard', 'Priority support'],
      featuresUr: ['Ù…ØªØ¹Ø¯Ø¯ Ø¹Ù„Ø§Ù‚Û’', 'ØªØ±Ù‚ÛŒ ÛŒØ§ÙØªÛ ÙÛØ±Ø³ØªÛŒÚº', 'ØªØ¬Ø²ÛŒØ§ØªÛŒ ÚˆÛŒØ´ Ø¨ÙˆØ±Úˆ', 'ØªØ±Ø¬ÛŒØ­ÛŒ Ø³Ù¾ÙˆØ±Ù¹'],
    ),
    SubscriptionPlanModel(id: 'sp3', name: 'Wholesale Monthly', nameUr: 'ÛÙˆÙ„ Ø³ÛŒÙ„ Ù…Ø§ÛØ§Ù†Û',
      role: 'wholesale', priceWeekly: 4000, priceMonthly: 12000,
      features: ['All listings access', 'Bulk inventory view', 'Price history', 'API access'],
      featuresUr: ['ØªÙ…Ø§Ù… ÙÛØ±Ø³ØªÛŒÚº', 'Ø¨Ù„Ú© Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ', 'Ù‚ÛŒÙ…Øª Ú©ÛŒ ØªØ§Ø±ÛŒØ®', 'API Ø±Ø³Ø§Ø¦ÛŒ'],
    ),
  ];
}
```

### `lib/core/mock/mock_service.dart`:

```dart
// Simulates real API calls with realistic delays
// Replace each method with a real Dio call when backend is ready

class MockService {
  Future<T> simulate<T>(T data, {int ms = 600}) async {
    await Future.delayed(Duration(milliseconds: ms));
    return data;
  }

  Future<List<ListingModel>> getListings({String? categoryId, String? role}) =>
    simulate(MockData.listings.where((l) =>
      categoryId == null || l.categoryId == categoryId).toList());

  Future<UserModel> login(String phone, String role) =>
    simulate(MockData.users[role] ?? MockData.users['customer']!);

  Future<bool> verifyOtp(String otp) =>
    simulate(otp == '123456', ms: 800); // mock OTP: 123456

  Future<List<CategoryModel>> getCategories() =>
    simulate(MockData.categories);

  Future<List<TransactionModel>> getTransactions() =>
    simulate(MockData.transactions);

  Future<List<NotificationModel>> getNotifications() =>
    simulate(MockData.notifications);
}
```

---

## ðŸ§­ ROUTER (`lib/core/router/app_router.dart`)

```dart
final appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (ctx, state) {
    final auth = ctx.read(authProvider);
    final isLoggedIn = auth.user != null;
    final isAuthRoute = state.matchedLocation.startsWith('/auth');
    final isSplash = state.matchedLocation == '/splash';
    if (isSplash) return null;
    if (!isLoggedIn && !isAuthRoute) return '/auth/login';
    if (isLoggedIn && isAuthRoute) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => SplashScreen()),
    GoRoute(path: '/onboarding', builder: (_, __) => OnboardingScreen()),
    ShellRoute(
      builder: (ctx, state, child) => AuthShell(child: child),
      routes: [
        GoRoute(path: '/auth/login', builder: (_, __) => LoginScreen()),
        GoRoute(path: '/auth/register', builder: (_, __) => RegisterScreen()),
        GoRoute(path: '/auth/otp', builder: (_, s) => OtpScreen(phone: s.extra as String)),
        GoRoute(path: '/auth/kyc', builder: (_, __) => KycScreen()),
      ],
    ),
    ShellRoute(
      builder: (ctx, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/home', builder: (_, __) => HomeScreen()),
        GoRoute(path: '/listings', builder: (_, __) => BrowseListingsScreen()),
        GoRoute(path: '/listings/create', builder: (_, __) => CreateListingScreen()),
        GoRoute(path: '/listings/:id', builder: (_, s) => ListingDetailScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/my-listings', builder: (_, __) => MyListingsScreen()),
        GoRoute(path: '/transactions', builder: (_, __) => TransactionsScreen()),
        GoRoute(path: '/transactions/:id', builder: (_, s) => TransactionDetailScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/transactions/:id/negotiate', builder: (_, s) => NegotiationScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/transactions/:id/bond', builder: (_, s) => BondViewerScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/chat/:roomId', builder: (_, s) => ChatScreen(roomId: s.pathParameters['roomId']!)),
        GoRoute(path: '/notifications', builder: (_, __) => NotificationsScreen()),
        GoRoute(path: '/subscription', builder: (_, __) => SubscriptionScreen()),
        GoRoute(path: '/subscription/plans', builder: (_, __) => PlansScreen()),
        GoRoute(path: '/wallet', builder: (_, __) => WalletScreen()),
        GoRoute(path: '/analytics', builder: (_, __) => AnalyticsScreen()),
        GoRoute(path: '/profile', builder: (_, __) => ProfileScreen()),
        GoRoute(path: '/settings', builder: (_, __) => SettingsScreen()),
      ],
    ),
  ],
);
```

---

## ðŸ“± SCREENS â€” BUILD EACH ONE FULLY

### 1. Splash Screen (`/features/splash/splash_screen.dart`):
```
- Full screen green gradient background
- Centered Lottie animation (recycling/market animation)
- App name in both Urdu and English below animation
- After 3 seconds: check if user is logged in
  â†’ Yes: navigate to /home
  â†’ No + first launch: navigate to /onboarding
  â†’ No + returning: navigate to /auth/login
```

### 2. Onboarding (`/features/onboarding/onboarding_screen.dart`):
```
- 3 slides with PageView
- Slide 1: "List your scrap" / "Ø§Ù¾Ù†Ø§ Ú©Ø¨Ø§Ú‘ ÙØ±ÙˆØ®Øª Ú©Ø±ÛŒÚº" + image
- Slide 2: "Connect with dealers" / "ÚˆÛŒÙ„Ø±Ø² Ø³Û’ Ø¬Ú‘ÛŒÚº" + image
- Slide 3: "Get the best price" / "Ø¨ÛØªØ±ÛŒÙ† Ù‚ÛŒÙ…Øª Ù¾Ø§Ø¦ÛŒÚº" + image
- SmoothPageIndicator dots at bottom
- "Skip" button top right
- "Next" / "Get Started" primary button
- Language toggle top: EN | Ø§Ø±Ø¯Ùˆ
```

### 3. Login Screen (`/features/auth/login_screen.dart`):
```
- Logo at top
- Tab bar: Phone Number | Email
- Phone tab:
  â†’ Country code dropdown showing ðŸ‡µðŸ‡° +92 (default, fixed for now)
  â†’ Phone number input with Pakistan format hint "3XX XXXXXXX"
  â†’ "Send OTP" primary button
- Email tab:
  â†’ Email input
  â†’ Password input with show/hide toggle
  â†’ "Login" button
- "Don't have an account? Register" link
- Language switch at bottom (EN | Ø§Ø±Ø¯Ùˆ)
- Test credentials shown in a dev banner:
  Customer: 0300-1234567 | OTP: 123456
  Dealer: 0321-9876543 | OTP: 123456
```

### 4. OTP Screen (`/features/auth/otp_screen.dart`):
```
- "We sent a code to +92 XXX-XXXXXXX"
- Pinput 6-digit OTP field (styled, auto-focus)
- Countdown timer "Resend in 04:32"
- "Verify" button
- "Resend OTP" link (active after countdown)
- Auto-submit when 6 digits entered
- Mock OTP: 123456 always works
- Loading state during verification
```

### 5. Register Screen (`/features/auth/register_screen.dart`):
```
- Full name field
- Phone number field (+92)
- Password + confirm password
- Role selector (styled card buttons):
  â†’ Customer (free) - icon: person
  â†’ Local Dealer (paid) - icon: store
  â†’ City Franchise (paid) - icon: business
  â†’ Wholesale (paid) - icon: warehouse
- City dropdown (Pakistan cities list)
- Terms checkbox
- "Create Account" button â†’ goes to OTP screen
```

### 6. Home Screen (`/features/home/home_screen.dart`):
```
Top section:
  - Greeting: "Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÛŒÚ©Ù…ØŒ Ali ðŸ‘‹" (Urdu) or "Welcome, Ali" (English)
  - City: "Karachi" with location pin icon
  - Notification bell icon (badge with count)

Stats Banner (for dealers/franchise):
  - 3 cards: "In Your Zone: 12" | "Your Deals: 3" | "This Month: â‚¨45,000"
  - Horizontal scroll

Search bar:
  - "Ú©ÛŒØ§ ÚˆÚ¾ÙˆÙ†Úˆ Ø±ÛÛ’ ÛÛŒÚºØŸ" / "What are you looking for?"

Categories Grid (2-column):
  - Each card: colored background, emoji icon, name in selected language
  - 8 categories + "See All" card
  - Tap â†’ navigate to /listings?category=xxx

Recent Listings section:
  - Heading "ØªØ§Ø²Û ÙÛØ±Ø³ØªÛŒÚº" / "Recent Listings"
  - Horizontal scroll of ListingCards
  - "View All" link

Bottom Navigation Bar:
  - Home | Browse | + (Create) | Deals | Profile
  - Center button (+) is FAB-style, green, slightly elevated
```

### 7. Browse Listings Screen (`/features/listings/browse_listings_screen.dart`):
```
- Toggle: List View | Map View (top right icon buttons)
- Category filter chips (horizontal scroll): All | Metals | Plastics | ...
- Sort button: Latest | Price Low | Price High | Quantity
- Visibility filter (for dealers): All | My Zone | Neighbor | City

List View:
  - ListView.builder of ListingCards
  - Pull to refresh
  - Infinite scroll (mock: load 5 more on scroll)
  - Empty state with Lottie animation

Map View:
  - Google Maps centered on user's city
  - Marker per listing (color = category color)
  - Tap marker â†’ show ListingCard bottom sheet
  - Cluster nearby markers (default Flutter Maps clustering)
```

### 8. Listing Card Widget (`/features/listings/widgets/listing_card.dart`):
```
- Image (CachedNetworkImage with shimmer placeholder)
- Category color strip on left side
- Title (language-aware)
- Price: "â‚¨ 850 / kg" in large text
- Quantity: "200 kg available"
- Location: "Korangi, Karachi"
- Time ago: "2 Ú¯Ú¾Ù†Ù¹Û’ Ù¾ÛÙ„Û’" / "2 hours ago"
- Visibility badge (colored chip): LOCAL | NEIGHBOR | CITY | WHOLESALE
- Interested count: "ðŸ‘ 5 interested"
```

### 9. Listing Detail Screen (`/features/listings/listing_detail_screen.dart`):
```
- Image carousel (PageView) with dot indicators
- Category + product type tags
- Title (large, language-aware)
- Price section: "â‚¨ 850 / kg" + "Negotiable" chip
- Quantity: "200 kg"
- Location map snippet (small Google Map, non-interactive)
- Seller info card: name, rating, member since
- Description (collapsible)
- Attributes section (if present): Purity: High | Condition: Good
- Bottom bar:
  â†’ Customer: "Edit Listing" (if own) or "Share"
  â†’ Dealer: "Express Interest" green button + "Chat" outlined button
  â†’ Already interested: "Negotiating..." badge
```

### 10. Create Listing (5-step wizard):
```
Step 1 â€” Category:
  - Grid of category cards (same as home)
  - Select category â†’ show subcategories
  - Progress indicator at top: Step 1 of 5

Step 2 â€” Photos:
  - "Add up to 5 photos" instruction
  - Grid with + boxes
  - Tap â†’ bottom sheet: Camera | Gallery
  - Drag to reorder
  - Delete icon on each photo
  - At least 1 photo required

Step 3 â€” Details:
  - Title field
  - Description field (multiline)
  - Price field (PKR, number keyboard)
  - "Price Negotiable" toggle
  - Quantity field + Unit dropdown (kg/ton/piece/bag/etc.)
  - Min order quantity (optional)
  - Dynamic attribute fields (from selected product type):
    â†’ e.g. for Copper: Purity (dropdown), Grade (dropdown)
  - Contact number (pre-filled from profile, editable)

Step 4 â€” Location:
  - Google Map with draggable pin
  - "Use my current location" button (requests GPS permission)
  - City dropdown (Pakistan cities)
  - Area/neighborhood text field
  - Full address field (optional)

Step 5 â€” Preview:
  - Full preview of how listing will look
  - "Looks good, Submit" primary button
  - "Edit" button (goes back)
  - Success dialog with Lottie animation on submit
```

### 11. Transactions Screen (`/features/transactions/transactions_screen.dart`):
```
- Tab bar: Active | Completed | Cancelled
- Transaction card:
  â†’ Listing thumbnail + title
  â†’ Buyer/Seller name
  â†’ Offered price â†’ Final price
  â†’ Status chip (color-coded)
  â†’ "View" button
```

### 12. Negotiation Screen (`/features/transactions/negotiation_screen.dart`):
```
- Listing summary card at top
- Current offer displayed prominently
- Make/counter offer:
  â†’ Price input field
  â†’ Quantity confirmation
  â†’ "Make Offer" button
- Accept offer button (green)
- Reject button (red outlined)
- "Finalize Deal" button (appears when both accepted)
- Chat section below (mini chat)
```

### 13. Chat Screen (`/features/chat/chat_screen.dart`):
```
- AppBar: contact name + online status dot
- ListView of message bubbles (mock messages)
- Message types:
  â†’ Text bubble (green = sent, grey = received)
  â†’ Offer card (special styled card with price + accept/reject)
  â†’ System message (centered grey text)
- Input bar: text field + send button + image attach
- RTL-aware: Urdu messages right-aligned
- Mock: 5 pre-loaded messages, typing simulation on send
```

### 14. Notifications Screen:
```
- "Mark all read" button in AppBar
- Grouped by: Today | Yesterday | Earlier
- Each notification:
  â†’ Icon (type-based: bell, offer, subscription, system)
  â†’ Title + body (in user's language)
  â†’ Time ago
  â†’ Unread = slight blue tint background
  â†’ Tap â†’ navigate to relevant screen
```

### 15. Subscription Screen:
```
- Current plan card:
  â†’ Plan name + role
  â†’ Days remaining (large number, progress bar)
  â†’ "18 days left" / "Ø¨Ø§Ù‚ÛŒ 18 Ø¯Ù†"
  â†’ Expiry date
  â†’ "Renew" button
- Plan comparison cards (3 plans)
- Payment section:
  â†’ "Select Payment Method"
  â†’ JazzCash (logo + "most popular" badge)
  â†’ Easypaisa (logo)
  â†’ Credit/Debit Card (Stripe)
  â†’ Phone number field (for JazzCash/Easypaisa)
  â†’ "Pay â‚¨1,500" button
- Mock: show success dialog on pay tap
```

### 16. Analytics Screen (Dealer/Franchise only):
```
- Summary row: Total Listings | Deals | Revenue | Zone Rank
- Bar chart: Monthly listings by category (fl_chart)
- Line chart: Deal value trend (last 6 months)
- Pie chart: Category breakdown
- Recent deals table
- All data from MockData
```

### 17. Profile Screen:
```
- Avatar (initials-based circle if no photo)
- Name + Role badge
- Phone + Email
- KYC status chip
- Zone assignment (for dealers)
- "Edit Profile" button
- Language switcher: English | Ø§Ø±Ø¯Ùˆ
- Subscription status mini card
- Sign out button (bottom, red text)
```

### 18. Settings Screen:
```
- Language: English | Ø§Ø±Ø¯Ùˆ (toggle, saves to SharedPreferences)
- Notifications: toggles per type
- App version
- Privacy Policy link
- Terms of Service link
- Contact Support
- "Delete Account" (red, confirmation dialog)
```

---

## ðŸŒ LOCALIZATION (`assets/translations/`)

### `assets/translations/en.json`:
```json
{
  "app_name": "Marketplace",
  "welcome": "Welcome",
  "login": "Login",
  "register": "Register",
  "phone_number": "Phone Number",
  "send_otp": "Send OTP",
  "verify": "Verify",
  "create_listing": "Create Listing",
  "browse_listings": "Browse Listings",
  "my_listings": "My Listings",
  "transactions": "Transactions",
  "profile": "Profile",
  "settings": "Settings",
  "price": "Price",
  "quantity": "Quantity",
  "category": "Category",
  "location": "Location",
  "submit": "Submit",
  "cancel": "Cancel",
  "next": "Next",
  "back": "Back",
  "make_offer": "Make an Offer",
  "accept": "Accept",
  "reject": "Reject",
  "finalize_deal": "Finalize Deal",
  "download_bond": "Download Bond",
  "your_zone": "Your Zone",
  "subscription_expires": "Subscription expires in {days} days",
  "renew_now": "Renew Now",
  "pay_now": "Pay Now",
  "sign_out": "Sign Out",
  "language": "Language",
  "notifications": "Notifications",
  "interested": "Interested",
  "hours_ago": "{n} hours ago",
  "days_ago": "{n} days ago"
}
```

### `assets/translations/ur.json`:
```json
{
  "app_name": "Ù…Ø§Ø±Ú©ÛŒÙ¹ Ù¾Ù„ÛŒØ³",
  "welcome": "Ø®ÙˆØ´ Ø¢Ù…Ø¯ÛŒØ¯",
  "login": "Ù„Ø§Ú¯ Ø§Ù†",
  "register": "Ø±Ø¬Ø³Ù¹Ø± Ú©Ø±ÛŒÚº",
  "phone_number": "ÙÙˆÙ† Ù†Ù…Ø¨Ø±",
  "send_otp": "OTP Ø¨Ú¾ÛŒØ¬ÛŒÚº",
  "verify": "ØªØµØ¯ÛŒÙ‚ Ú©Ø±ÛŒÚº",
  "create_listing": "ÙÛØ±Ø³Øª Ø¨Ù†Ø§Ø¦ÛŒÚº",
  "browse_listings": "ÙÛØ±Ø³ØªÛŒÚº Ø¯ÛŒÚ©Ú¾ÛŒÚº",
  "my_listings": "Ù…ÛŒØ±ÛŒ ÙÛØ±Ø³ØªÛŒÚº",
  "transactions": "Ù„ÛŒÙ† Ø¯ÛŒÙ†",
  "profile": "Ù¾Ø±ÙˆÙØ§Ø¦Ù„",
  "settings": "ØªØ±ØªÛŒØ¨Ø§Øª",
  "price": "Ù‚ÛŒÙ…Øª",
  "quantity": "Ù…Ù‚Ø¯Ø§Ø±",
  "category": "Ø²Ù…Ø±Û",
  "location": "Ù…Ù‚Ø§Ù…",
  "submit": "Ø¬Ù…Ø¹ Ú©Ø±ÛŒÚº",
  "cancel": "Ù…Ù†Ø³ÙˆØ® Ú©Ø±ÛŒÚº",
  "next": "Ø§Ú¯Ù„Ø§",
  "back": "Ù¾ÛŒÚ†Ú¾Û’",
  "make_offer": "Ù¾ÛŒØ´Ú©Ø´ Ú©Ø±ÛŒÚº",
  "accept": "Ù‚Ø¨ÙˆÙ„ Ú©Ø±ÛŒÚº",
  "reject": "Ø±Ø¯ Ú©Ø±ÛŒÚº",
  "finalize_deal": "ÚˆÛŒÙ„ Ù…Ú©Ù…Ù„ Ú©Ø±ÛŒÚº",
  "download_bond": "Ø¨Ø§Ù†Úˆ ÚˆØ§Ø¤Ù†Ù„ÙˆÚˆ Ú©Ø±ÛŒÚº",
  "your_zone": "Ø¢Ù¾ Ú©Ø§ Ø¹Ù„Ø§Ù‚Û",
  "subscription_expires": "Ø³Ø¨Ø³Ú©Ø±Ù¾Ø´Ù† {days} Ø¯Ù† Ù…ÛŒÚº Ø®ØªÙ… ÛÙˆÚ¯ÛŒ",
  "renew_now": "Ø§Ø¨Ú¾ÛŒ ØªØ¬Ø¯ÛŒØ¯ Ú©Ø±ÛŒÚº",
  "pay_now": "Ø§Ø¨Ú¾ÛŒ Ø§Ø¯Ø§Ø¦ÛŒÚ¯ÛŒ Ú©Ø±ÛŒÚº",
  "sign_out": "Ø³Ø§Ø¦Ù† Ø¢Ø¤Ù¹",
  "language": "Ø²Ø¨Ø§Ù†",
  "notifications": "Ø§Ø·Ù„Ø§Ø¹Ø§Øª",
  "interested": "Ø¯Ù„Ú†Ø³Ù¾ÛŒ ÛÛ’",
  "hours_ago": "{n} Ú¯Ú¾Ù†Ù¹Û’ Ù¾ÛÙ„Û’",
  "days_ago": "{n} Ø¯Ù† Ù¾ÛÙ„Û’"
}
```

---

## ðŸ› ï¸ MAIN.DART

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  runApp(
    EasyLocalization(
      supportedLocales: [Locale('en'), Locale('ur')],
      path: 'assets/translations',
      fallbackLocale: Locale('en'),
      startLocale: Locale('ur'),   // default Urdu
      child: ProviderScope(
        child: MarketplaceApp(),
      ),
    ),
  );
}

class MarketplaceApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = context.locale;
    return MaterialApp.router(
      title: 'Ù…Ø§Ø±Ú©ÛŒÙ¹ Ù¾Ù„ÛŒØ³',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      locale: locale,
      supportedLocales: context.supportedLocales,
      localizationsDelegates: context.localizationDelegates,
      routerConfig: appRouter,
      builder: (context, child) {
        // Apply RTL for Urdu
        return Directionality(
          textDirection: locale.languageCode == 'ur'
              ? TextDirection.rtl
              : TextDirection.ltr,
          child: child!,
        );
      },
    );
  }
}
```

---

## ðŸš€ BUILD & RUN ON AVD COMMANDS

Add these to `README.md` and run them in order:

```bash
# â”€â”€ SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# 1. Get dependencies
flutter pub get

# 2. Generate code (Riverpod, etc.)
flutter pub run build_runner build --delete-conflicting-outputs

# 3. Verify no errors
flutter analyze

# â”€â”€ AVD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# 4. List available AVDs
emulator -list-avds

# 5. Start AVD (replace name with yours)
emulator -avd Pixel_6_Pro_API_33 &

# 6. Wait for AVD to boot, then verify
flutter devices

# â”€â”€ RUN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# 7. Run debug build on AVD
flutter run -d emulator-5554

# 8. Run with Urdu locale forced
flutter run -d emulator-5554 --dart-define=FORCE_LOCALE=ur

# â”€â”€ BUILD APK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# 9. Build debug APK (faster, for AVD testing)
flutter build apk --debug

# 10. Install debug APK directly on running AVD
flutter install --debug

# 11. Build release APK (for sharing/testing on real device)
flutter build apk --release --target-platform android-arm64

# APK location:
# build/app/outputs/flutter-apk/app-debug.apk
# build/app/outputs/flutter-apk/app-release.apk

# â”€â”€ INSTALL APK ON AVD MANUALLY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# 12. Install APK via ADB (if flutter install doesn't work)
adb install build/app/outputs/flutter-apk/app-debug.apk

# 13. Check ADB connected devices
adb devices

# â”€â”€ HOT RELOAD (during development) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Press 'r' in terminal = Hot Reload
# Press 'R' = Hot Restart
# Press 'q' = Quit
```

---

## âš ï¸ COMMON AVD ISSUES & FIXES

```
Issue: "No connected devices"
Fix: adb kill-server && adb start-server && flutter devices

Issue: "License not accepted"
Fix: flutter doctor --android-licenses â†’ accept all

Issue: "Gradle build failed"
Fix: cd android && ./gradlew clean && cd .. && flutter run

Issue: "SDK version too low"
Fix: In android/app/build.gradle â†’ minSdkVersion 24

Issue: "Google Maps blank/grey on AVD"
Fix: Add valid API key in AndroidManifest.xml
    OR use: GoogleMap(myLocationEnabled: false) for prototype

Issue: "App crashes on Urdu RTL"
Fix: Wrap all Row widgets with Directionality check

Issue: "Lottie animation not loading"
Fix: Ensure lottie JSON files are in assets/animations/ 
    and declared in pubspec.yaml

Issue: "Image picker crash on AVD"
Fix: AVD must have API 24+. Add to AndroidManifest:
    android:requestLegacyExternalStorage="true"

Issue: "Build too slow"
Fix: In gradle.properties add:
    org.gradle.jvmargs=-Xmx4G
    org.gradle.parallel=true
    android.enableR8.fullMode=false
```

---

## ðŸ§ª DEMO FLOW TO TEST ON AVD

After installing, test this exact flow:

```
1. Open app â†’ see Splash with animation
2. Tap through 3 onboarding slides
3. Login screen â†’ toggle to Urdu â†’ see RTL layout
4. Enter phone: 03001234567 â†’ Send OTP
5. Enter OTP: 123456 â†’ verify â†’ home screen
6. Browse home: see categories grid + recent listings
7. Tap "Metals" category â†’ filtered listings
8. Tap Copper Wire listing â†’ detail screen
9. Tap "Express Interest" â†’ transaction created
10. Go to Transactions tab â†’ see negotiation
11. Tap negotiate â†’ make offer (â‚¨800/kg)
12. Go to Chat â†’ see conversation
13. Go to Profile â†’ switch language to English â†’ UI changes
14. Go to Subscription â†’ see plan + JazzCash payment mock
15. Tap Create (+) â†’ go through 5-step listing creation
16. Submit listing â†’ success animation
17. Go to My Listings â†’ see new listing
```

---

## ðŸŽ¯ CURSOR AI INSTRUCTIONS

1. Build **every screen listed above** fully â€” no placeholder screens
2. Use **MockService** for all data â€” no real API calls yet
3. Every screen must work in **both English (LTR) and Urdu (RTL)**
4. All prices displayed as **â‚¨ X,XXX** format (PKR)
5. All screens must be **responsive** â€” test on Pixel 6 Pro (1080x2400) and Pixel 4 (1080x2280)
6. Use **flutter_animate** for smooth page transitions and micro-animations
7. Use **shimmer** for all loading states â€” no circular progress indicators on list screens
8. Navigation via **GoRouter only** â€” no Navigator.push anywhere
9. State via **Riverpod only** â€” no setState except inside StatefulWidget for local UI state
10. The app must **compile and run** with `flutter run` on first try â€” zero runtime errors
11. After every feature: run `flutter analyze` â€” fix all warnings before moving to next screen
12. Build in this order: pubspec â†’ main.dart â†’ theme â†’ models â†’ mock data â†’ router â†’ splash â†’ onboarding â†’ auth â†’ home â†’ listings â†’ transactions â†’ chat â†’ rest
```

# ðŸ§  CursorAI Master Development Prompt
## Geo-Controlled Franchise Marketplace Platform â€” Full Stack, End to End
### ðŸ‡µðŸ‡° Primary Market: Pakistan | Extensible for Multi-Country, Multi-Currency, Multi-Language

---

## ðŸ“Œ PROJECT IDENTITY

You are building a **production-grade, geo-fenced, franchise-based B2B/B2C marketplace platform** for trading recyclable and reusable goods (scrap, waste, furniture, electronics, etc.).

The platform includes:
- **Android & iOS Mobile App** (Flutter)
- **Client Web Portal** (React.js â€” for dealers/franchises/customers)
- **Admin Web Portal** (React.js â€” for super admin & platform management)
- **Backend API** (Node.js + NestJS â€” RESTful + WebSocket)
- **Database** (PostgreSQL + PostGIS)
- **Cloud Infrastructure** (AWS)

**Primary deployment country: Pakistan**
- Default currency: **PKR (Pakistani Rupee â‚¨)**
- Default languages: **Urdu (ur) + English (en)**
- Default timezone: **Asia/Karachi (PKT, UTC+5)**
- Default phone format: **+92 (Pakistan)**
- Payment gateways: **JazzCash + Easypaisa + Stripe (international)**
- Maps: Google Maps API (Pakistan region bias)

This is NOT a simple CRUD app. It is a **controlled supply-chain digitization system** with geo-fencing, role-based access, subscription enforcement, escalation logic, digital transaction bonding, and full internationalization support.

---

## ðŸ—‚ï¸ MONOREPO PROJECT STRUCTURE

```
/geo-franchise-marketplace
â”‚
â”œâ”€â”€ /apps
â”‚   â”œâ”€â”€ /mobile              â†’ Flutter app (Android + iOS)
â”‚   â”œâ”€â”€ /web-admin           â†’ React.js Admin Portal
â”‚   â””â”€â”€ /web-client          â†’ React.js Client/Dealer Portal
â”‚
â”œâ”€â”€ /backend
â”‚   â”œâ”€â”€ /src
â”‚   â”‚   â”œâ”€â”€ /modules
â”‚   â”‚   â”‚   â”œâ”€â”€ auth
â”‚   â”‚   â”‚   â”œâ”€â”€ users
â”‚   â”‚   â”‚   â”œâ”€â”€ roles
â”‚   â”‚   â”‚   â”œâ”€â”€ listings
â”‚   â”‚   â”‚   â”œâ”€â”€ categories           â† DYNAMIC (admin-managed table)
â”‚   â”‚   â”‚   â”œâ”€â”€ product-types        â† DYNAMIC (admin-managed table)
â”‚   â”‚   â”‚   â”œâ”€â”€ product-attributes   â† DYNAMIC (EAV per category)
â”‚   â”‚   â”‚   â”œâ”€â”€ units                â† DYNAMIC (admin-managed table)
â”‚   â”‚   â”‚   â”œâ”€â”€ geo-zones
â”‚   â”‚   â”‚   â”œâ”€â”€ dealers
â”‚   â”‚   â”‚   â”œâ”€â”€ franchises
â”‚   â”‚   â”‚   â”œâ”€â”€ wholesale
â”‚   â”‚   â”‚   â”œâ”€â”€ subscriptions
â”‚   â”‚   â”‚   â”œâ”€â”€ payments
â”‚   â”‚   â”‚   â”œâ”€â”€ transactions
â”‚   â”‚   â”‚   â”œâ”€â”€ bonds
â”‚   â”‚   â”‚   â”œâ”€â”€ notifications
â”‚   â”‚   â”‚   â”œâ”€â”€ escalation-engine
â”‚   â”‚   â”‚   â”œâ”€â”€ chat
â”‚   â”‚   â”‚   â”œâ”€â”€ analytics
â”‚   â”‚   â”‚   â”œâ”€â”€ audit-logs
â”‚   â”‚   â”‚   â”œâ”€â”€ currencies           â† NEW: Multi-currency module
â”‚   â”‚   â”‚   â”œâ”€â”€ languages            â† NEW: Multi-language module
â”‚   â”‚   â”‚   â”œâ”€â”€ translations         â† NEW: Translation strings table
â”‚   â”‚   â”‚   â”œâ”€â”€ countries            â† NEW: Country/region config
â”‚   â”‚   â”‚   â””â”€â”€ admin
â”‚   â”‚   â”œâ”€â”€ /common
â”‚   â”‚   â”œâ”€â”€ /guards
â”‚   â”‚   â”œâ”€â”€ /interceptors
â”‚   â”‚   â”œâ”€â”€ /pipes
â”‚   â”‚   â”œâ”€â”€ /decorators
â”‚   â”‚   â””â”€â”€ /config
â”‚   â”œâ”€â”€ /prisma
â”‚   â””â”€â”€ /test
â”‚
â”œâ”€â”€ /shared                  â†’ Shared TypeScript types/interfaces
â”œâ”€â”€ /infrastructure          â†’ Docker, Terraform, AWS configs
â”œâ”€â”€ docker-compose.yml
â””â”€â”€ README.md
```

---

## âš™ï¸ TECH STACK (STRICT)

| Layer | Technology |
|---|---|
| Mobile | Flutter 3.x (Dart) |
| Web Portals | React.js 18 + TypeScript + TailwindCSS + shadcn/ui |
| Backend | Node.js + NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15 + PostGIS |
| Cache | Redis |
| File Storage | AWS S3 |
| Auth | JWT + Refresh Tokens + OTP (Twilio/Firebase) |
| Payments | JazzCash + Easypaisa + Stripe |
| PDF Generation | Puppeteer |
| Real-time | Socket.io |
| Email | Nodemailer + SendGrid |
| SMS/OTP | Twilio (Pakistan number support) |
| Background Jobs | Bull + Redis |
| Maps | Google Maps API (Pakistan region bias) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| i18n Backend | i18next (NestJS) |
| i18n Web | react-i18next |
| i18n Mobile | easy_localization (Flutter) |
| Currency Conversion | Open Exchange Rates API (stub, extensible) |
| Containerization | Docker + Docker Compose |
| State Mgmt (Web) | Zustand |
| State Mgmt (Mobile) | Riverpod |
| API Docs | Swagger |
| Testing | Jest + Flutter Test |

---

## ðŸŒ MODULE A â€” COUNTRY & REGION CONFIGURATION

This module controls which countries the platform is deployed in. Each country has its own currency, language, timezone, phone format, and payment gateways. Pakistan is country ID `PK` and is the **default**.

### Prisma Schema:

```prisma
model Country {
  id                String      @id           // ISO 3166-1 alpha-2: "PK", "AE", "US"
  name              String                    // "Pakistan"
  nativeName        String                    // "Ù¾Ø§Ú©Ø³ØªØ§Ù†"
  phoneCode         String                    // "+92"
  phoneFormat       String                    // "3XX-XXXXXXX"
  defaultCurrencyId String
  defaultCurrency   Currency    @relation(fields: [defaultCurrencyId], references: [id])
  defaultLanguageId String
  defaultLanguage   Language    @relation(fields: [defaultLanguageId], references: [id])
  timezone          String                    // "Asia/Karachi"
  isActive          Boolean     @default(true)
  isDefault         Boolean     @default(false)  // Only PK = true initially
  geoZones          GeoZone[]
  supportedCurrencies CountryCurrency[]
  supportedLanguages  CountryLanguage[]
  paymentGateways   CountryPaymentGateway[]
  subscriptionPlans SubscriptionPlan[]
  createdAt         DateTime    @default(now())
}
```

### Seed Pakistan as default:

```typescript
// prisma/seed.ts â€” Country seed
await prisma.country.create({
  data: {
    id: 'PK',
    name: 'Pakistan',
    nativeName: 'Ù¾Ø§Ú©Ø³ØªØ§Ù†',
    phoneCode: '+92',
    phoneFormat: '3XX-XXXXXXX',
    defaultCurrencyId: 'PKR',
    defaultLanguageId: 'ur',
    timezone: 'Asia/Karachi',
    isActive: true,
    isDefault: true,
  }
});
```

### Endpoints:

```
GET    /countries                   â†’ List active countries
GET    /countries/:id               â†’ Country detail
POST   /admin/countries             â†’ Add new country
PUT    /admin/countries/:id         â†’ Update country config
PUT    /admin/countries/:id/toggle  â†’ Enable/disable country
```

---

## ðŸ’± MODULE B â€” CURRENCY MODULE (Multi-Currency, PKR Default)

### Design Principles:
- All **monetary values stored in the database as integers (paisa/cents)** to avoid floating point errors
- All **display conversions** happen at the API response layer via a `CurrencyService`
- Default currency is **PKR**; admin can add new currencies without code changes
- Exchange rates are stored in DB and can be updated manually or via scheduled job (Open Exchange Rates API stub)

### Prisma Schema:

```prisma
model Currency {
  id              String    @id           // ISO 4217: "PKR", "USD", "AED", "SAR"
  name            String                  // "Pakistani Rupee"
  nativeName      String                  // "Ø±ÙˆÙ¾ÛŒÛ"
  symbol          String                  // "â‚¨"
  symbolNative    String                  // "Ø±"
  symbolPosition  SymbolPosition @default(PREFIX)  // PREFIX or SUFFIX
  decimalDigits   Int       @default(2)
  rounding        Float     @default(0)
  isActive        Boolean   @default(true)
  isDefault       Boolean   @default(false)  // Only PKR = true
  exchangeRates   ExchangeRate[] @relation("BaseCurrency")
  targetRates     ExchangeRate[] @relation("TargetCurrency")
  countries       Country[]
  countryLinks    CountryCurrency[]
  listings        Listing[]
  transactions    Transaction[]
  wallets         Wallet[]
  subscriptionPrices SubscriptionPrice[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ExchangeRate {
  id              String    @id @default(uuid())
  baseCurrencyId  String                  // "PKR"
  baseCurrency    Currency  @relation("BaseCurrency", fields: [baseCurrencyId], references: [id])
  targetCurrencyId String                 // "USD"
  targetCurrency  Currency  @relation("TargetCurrency", fields: [targetCurrencyId], references: [id])
  rate            Decimal   @db.Decimal(18,8)   // 1 PKR = 0.00360 USD
  source          String    @default("MANUAL")  // "MANUAL" | "OPEN_EXCHANGE" | "STATE_BANK_PK"
  effectiveAt     DateTime  @default(now())
  createdAt       DateTime  @default(now())

  @@unique([baseCurrencyId, targetCurrencyId])
}

model CountryCurrency {
  countryId   String
  country     Country   @relation(fields: [countryId], references: [id])
  currencyId  String
  currency    Currency  @relation(fields: [currencyId], references: [id])
  isPrimary   Boolean   @default(false)

  @@id([countryId, currencyId])
}

enum SymbolPosition {
  PREFIX
  SUFFIX
}
```

### CurrencyService:

```typescript
// /modules/currencies/currency.service.ts

@Injectable()
export class CurrencyService {
  // Format amount (stored as integer paisa) to display string
  format(amountPaisa: number, currencyId: string): string {
    // e.g. 150000 paisa â†’ "â‚¨ 1,500" for PKR
    // Apply symbol, position, decimal digits, thousands separator
    // Urdu: use Urdu numerals if locale is 'ur'
  }

  // Convert between currencies
  async convert(amount: number, from: string, to: string): Promise<number> {
    // Fetch rate from DB (cached in Redis for 1 hour)
    // Return converted integer amount
  }

  // Get current default currency for a country
  async getDefaultForCountry(countryId: string): Promise<Currency> {}
}
```

### Endpoints:

```
GET    /currencies                        â†’ List active currencies
GET    /currencies/:id                    â†’ Currency detail + current rate
GET    /currencies/:id/rates              â†’ Exchange rate history
POST   /admin/currencies                  â†’ Add new currency
PUT    /admin/currencies/:id              â†’ Update currency metadata
PUT    /admin/currencies/:id/toggle       â†’ Enable/disable currency
POST   /admin/currencies/rates            â†’ Set exchange rate manually
POST   /admin/currencies/rates/sync       â†’ Trigger rate sync from API
```

### Seed PKR as default:

```typescript
await prisma.currency.create({
  data: {
    id: 'PKR',
    name: 'Pakistani Rupee',
    nativeName: 'Ø±ÙˆÙ¾ÛŒÛ',
    symbol: 'â‚¨',
    symbolNative: 'Ø±',
    symbolPosition: 'PREFIX',
    decimalDigits: 0,          // PKR has no paisa in common use
    rounding: 0,
    isActive: true,
    isDefault: true,
  }
});

// Also seed: USD, AED, SAR, GBP as inactive (ready to activate)
```

**Important:** All `price` fields in Listing and Transaction models store values as **integer (PKR amount Ã— 100 for paisa, or Ã— 1 for PKR with decimalDigits=0)**. The `currencyId` field on each record stores which currency was used at time of listing.

---

## ðŸŒ MODULE C â€” LANGUAGE & LOCALIZATION MODULE

### Design Principles:
- Default languages: **Urdu (ur)** and **English (en)**
- RTL support for Urdu (right-to-left text direction)
- All UI string keys stored in a `Translation` table â€” admin can edit from portal without redeployment
- New languages can be added by admin with zero code changes
- Language preference stored per user; fallback to country default

### Prisma Schema:

```prisma
model Language {
  id              String    @id           // BCP 47: "ur", "en", "ar", "zh"
  name            String                  // "Urdu"
  nativeName      String                  // "Ø§Ø±Ø¯Ùˆ"
  direction       TextDirection @default(LTR)
  isActive        Boolean   @default(true)
  isDefault       Boolean   @default(false)  // "ur" = true for PK
  flagEmoji       String?                 // "ðŸ‡µðŸ‡°"
  countryLinks    CountryLanguage[]
  translations    Translation[]
  users           User[]    @relation("UserLanguage")
  createdAt       DateTime  @default(now())
}

model CountryLanguage {
  countryId   String
  country     Country   @relation(fields: [countryId], references: [id])
  languageId  String
  language    Language  @relation(fields: [languageId], references: [id])
  isPrimary   Boolean   @default(false)

  @@id([countryId, languageId])
}

model Translation {
  id          String    @id @default(uuid())
  languageId  String
  language    Language  @relation(fields: [languageId], references: [id])
  namespace   String                    // "common" | "listings" | "auth" | "notifications" | "categories"
  key         String                    // "listing.create.title"
  value       String                    // "Ù†Ø¦ÛŒ ÙÛØ±Ø³Øª Ø¨Ù†Ø§Ø¦ÛŒÚº" (Urdu) or "Create New Listing" (English)
  isRTL       Boolean   @default(false)
  updatedAt   DateTime  @updatedAt
  createdAt   DateTime  @default(now())

  @@unique([languageId, namespace, key])
}

enum TextDirection {
  LTR
  RTL
}
```

### i18n Implementation:

**Backend (NestJS):**
```typescript
// /modules/languages/i18n.service.ts
// On app bootstrap, load all translations from DB into Redis
// Cache key: translations:{languageId}:{namespace}
// Invalidate on admin update
// Serve via /translations endpoint for frontend hydration

// Middleware: read Accept-Language header or user.languageId
// Set req.lang = resolved language
// All notification messages translated before sending
```

**Translation endpoints:**
```
GET  /translations/:languageId            â†’ Full translation map for language
GET  /translations/:languageId/:namespace â†’ Namespace-specific keys
POST /admin/translations                  â†’ Create translation key
PUT  /admin/translations/:id              â†’ Update translation value
POST /admin/translations/bulk-import      â†’ Import JSON file of keys
GET  /admin/translations/export/:langId   â†’ Export as JSON
POST /admin/languages                     â†’ Add new language
PUT  /admin/languages/:id/toggle          â†’ Enable/disable language
```

**Web Portals (react-i18next):**
```typescript
// On app load: fetch /translations/{userLang} â†’ store in i18next
// Fallback chain: userLang â†’ countryDefault â†’ 'en'
// RTL: set document.dir = language.direction
// Example usage: t('listing.create.title')
// Admin portal has inline translation editor (click any text â†’ edit in place)
```

**Mobile (easy_localization Flutter):**
```dart
// Fetch translations from API on first launch â†’ cache locally
// Re-fetch if version hash changes
// Support RTL layout for Urdu using Directionality widget
// Urdu font: Jameel Noori Nastaleeq (bundled in assets)
// English font: Inter
```

### Seed translations (Urdu + English for all namespaces):

Create a seed file `/prisma/translations/` with JSON files:
- `en.common.json`, `ur.common.json`
- `en.auth.json`, `ur.auth.json`
- `en.listings.json`, `ur.listings.json`
- `en.notifications.json`, `ur.notifications.json`
- `en.categories.json`, `ur.categories.json`
- `en.errors.json`, `ur.errors.json`

**Sample translations to include:**

| Key | English | Urdu |
|---|---|---|
| `app.name` | Marketplace | Ù…Ø§Ø±Ú©ÛŒÙ¹ Ù¾Ù„ÛŒØ³ |
| `listing.create` | Create Listing | ÙÛØ±Ø³Øª Ø¨Ù†Ø§Ø¦ÛŒÚº |
| `listing.price` | Price | Ù‚ÛŒÙ…Øª |
| `listing.quantity` | Quantity | Ù…Ù‚Ø¯Ø§Ø± |
| `listing.category` | Category | Ø²Ù…Ø±Û |
| `auth.login` | Login | Ù„Ø§Ú¯ Ø§Ù† |
| `auth.register` | Register | Ø±Ø¬Ø³Ù¹Ø± Ú©Ø±ÛŒÚº |
| `auth.phone` | Phone Number | ÙÙˆÙ† Ù†Ù…Ø¨Ø± |
| `dealer.zone` | Your Zone | Ø¢Ù¾ Ú©Ø§ Ø¹Ù„Ø§Ù‚Û |
| `subscription.expired` | Subscription Expired | Ø³Ø¨Ø³Ú©Ø±Ù¾Ø´Ù† Ø®ØªÙ… ÛÙˆ Ú¯Ø¦ÛŒ |
| `transaction.offer` | Make an Offer | Ù¾ÛŒØ´Ú©Ø´ Ú©Ø±ÛŒÚº |
| `bond.download` | Download Bond | Ø¨Ø§Ù†Úˆ ÚˆØ§Ø¤Ù†Ù„ÙˆÚˆ Ú©Ø±ÛŒÚº |

---

## ðŸ“¦ MODULE D â€” DYNAMIC PRODUCT CATALOG SYSTEM

This is fully **admin-managed**. No product types, categories, subcategories, or attributes are hardcoded. Everything is database-driven and manageable from the Admin Portal with zero code deployment.

### Architecture:

```
Category (top level, e.g. "Metals")
  â””â”€â”€ SubCategory (e.g. "Copper")
        â””â”€â”€ ProductType (e.g. "Copper Wire")
              â””â”€â”€ ProductAttribute (e.g. "Purity", "Gauge")
                    â””â”€â”€ AttributeOption (e.g. "99%", "High Purity")
```

### Prisma Schema:

```prisma
// â”€â”€â”€ CATEGORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
model Category {
  id              String        @id @default(uuid())
  slug            String        @unique   // "metals", "electronics"
  icon            String?                 // S3 URL of category icon
  colorHex        String?                 // "#F59E0B" for UI theming
  sortOrder       Int           @default(0)
  isActive        Boolean       @default(true)
  parentId        String?
  parent          Category?     @relation("CategoryTree", fields: [parentId], references: [id])
  children        Category[]    @relation("CategoryTree")
  productTypes    ProductType[]
  listings        Listing[]
  translations    CategoryTranslation[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model CategoryTranslation {
  id          String    @id @default(uuid())
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])
  languageId  String
  name        String    // "Ø¯Ú¾Ø§ØªÛŒÚº" (Urdu) / "Metals" (English)
  description String?

  @@unique([categoryId, languageId])
}

// â”€â”€â”€ PRODUCT TYPE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
model ProductType {
  id              String              @id @default(uuid())
  slug            String              @unique   // "copper-wire"
  categoryId      String
  category        Category            @relation(fields: [categoryId], references: [id])
  icon            String?
  isActive        Boolean             @default(true)
  sortOrder       Int                 @default(0)
  attributes      ProductAttribute[]
  listings        Listing[]
  translations    ProductTypeTranslation[]
  priceHistory    PriceHistory[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

model ProductTypeTranslation {
  id              String      @id @default(uuid())
  productTypeId   String
  productType     ProductType @relation(fields: [productTypeId], references: [id])
  languageId      String
  name            String      // "ØªØ§Ù†Ø¨Û’ Ú©ÛŒ ØªØ§Ø±" (Urdu) / "Copper Wire" (English)
  description     String?
  unitLabel       String?     // "Ú©Ù„Ùˆ" / "kg"

  @@unique([productTypeId, languageId])
}

// â”€â”€â”€ PRODUCT ATTRIBUTES (EAV) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
model ProductAttribute {
  id              String                  @id @default(uuid())
  productTypeId   String
  productType     ProductType             @relation(fields: [productTypeId], references: [id])
  slug            String                  // "purity", "gauge", "condition"
  inputType       AttributeInputType      @default(SELECT)
  isRequired      Boolean                 @default(false)
  isFilterable    Boolean                 @default(true)
  sortOrder       Int                     @default(0)
  isActive        Boolean                 @default(true)
  options         AttributeOption[]
  listingValues   ListingAttributeValue[]
  translations    AttributeTranslation[]
  createdAt       DateTime                @default(now())
}

model AttributeOption {
  id              String              @id @default(uuid())
  attributeId     String
  attribute       ProductAttribute    @relation(fields: [attributeId], references: [id])
  slug            String              // "high-purity"
  sortOrder       Int                 @default(0)
  isActive        Boolean             @default(true)
  translations    OptionTranslation[]
  listingValues   ListingAttributeValue[]
}

model AttributeTranslation {
  id          String            @id @default(uuid())
  attributeId String
  attribute   ProductAttribute  @relation(fields: [attributeId], references: [id])
  languageId  String
  label       String            // "Ø®Ù„ÙˆØµ" / "Purity"

  @@unique([attributeId, languageId])
}

model OptionTranslation {
  id        String          @id @default(uuid())
  optionId  String
  option    AttributeOption @relation(fields: [optionId], references: [id])
  languageId String
  label     String          // "Ø§Ø¹Ù„ÛŒ Ø®Ù„ÙˆØµ" / "High Purity"

  @@unique([optionId, languageId])
}

// â”€â”€â”€ LISTING ATTRIBUTE VALUES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
model ListingAttributeValue {
  id          String            @id @default(uuid())
  listingId   String
  listing     Listing           @relation(fields: [listingId], references: [id])
  attributeId String
  attribute   ProductAttribute  @relation(fields: [attributeId], references: [id])
  optionId    String?           // For SELECT type
  option      AttributeOption?  @relation(fields: [optionId], references: [id])
  textValue   String?           // For TEXT type
  numberValue Decimal?          // For NUMBER type

  @@unique([listingId, attributeId])
}

enum AttributeInputType {
  TEXT
  NUMBER
  SELECT
  MULTI_SELECT
  BOOLEAN
  DATE
}

// â”€â”€â”€ UNITS OF MEASUREMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
model Unit {
  id              String            @id @default(uuid())
  slug            String            @unique   // "kg", "ton", "piece", "liter"
  type            UnitType                    // WEIGHT | VOLUME | COUNT | LENGTH | AREA
  isBaseUnit      Boolean           @default(false)
  conversionFactor Decimal          @db.Decimal(18,8) @default(1)
  isActive        Boolean           @default(true)
  sortOrder       Int               @default(0)
  translations    UnitTranslation[]
  listings        Listing[]
  createdAt       DateTime          @default(now())
}

model UnitTranslation {
  id          String    @id @default(uuid())
  unitId      String
  unit        Unit      @relation(fields: [unitId], references: [id])
  languageId  String
  name        String    // "Ú©Ù„ÙˆÚ¯Ø±Ø§Ù…" / "Kilogram"
  abbreviation String   // "Ú©Ù„Ùˆ" / "kg"

  @@unique([unitId, languageId])
}

enum UnitType {
  WEIGHT
  VOLUME
  COUNT
  LENGTH
  AREA
  OTHER
}

// â”€â”€â”€ PRICE HISTORY (per product type, for AI suggestion) â”€â”€â”€â”€â”€â”€
model PriceHistory {
  id              String      @id @default(uuid())
  productTypeId   String
  productType     ProductType @relation(fields: [productTypeId], references: [id])
  currencyId      String
  currency        Currency    @relation(fields: [currencyId], references: [id])
  minPricePaisa   BigInt
  maxPricePaisa   BigInt
  avgPricePaisa   BigInt
  sampleCount     Int
  recordedAt      DateTime    @default(now())

  @@index([productTypeId, currencyId, recordedAt])
}
```

### Admin Catalog Management Endpoints:

```
// â”€â”€â”€ CATEGORIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
GET    /admin/categories                       â†’ Full category tree
POST   /admin/categories                       â†’ Create category
PUT    /admin/categories/:id                   â†’ Update
DELETE /admin/categories/:id                   â†’ Soft delete (isActive=false)
PUT    /admin/categories/:id/sort              â†’ Reorder
POST   /admin/categories/:id/translations      â†’ Add/update translation
POST   /admin/categories/:id/icon              â†’ Upload icon (S3)

// â”€â”€â”€ PRODUCT TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
GET    /admin/product-types                    â†’ All product types (paginated)
GET    /admin/product-types?categoryId=:id     â†’ Filter by category
POST   /admin/product-types                    â†’ Create product type
PUT    /admin/product-types/:id                â†’ Update
DELETE /admin/product-types/:id                â†’ Soft delete
POST   /admin/product-types/:id/translations   â†’ Add translation
PUT    /admin/product-types/:id/toggle         â†’ Enable/disable

// â”€â”€â”€ ATTRIBUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
GET    /admin/product-types/:id/attributes     â†’ Get attributes for type
POST   /admin/product-types/:id/attributes     â†’ Add attribute
PUT    /admin/attributes/:id                   â†’ Update attribute
DELETE /admin/attributes/:id                   â†’ Remove attribute
POST   /admin/attributes/:id/options           â†’ Add option to attribute
PUT    /admin/attribute-options/:id            â†’ Update option
DELETE /admin/attribute-options/:id            â†’ Remove option
POST   /admin/attributes/:id/translations      â†’ Add attribute translation

// â”€â”€â”€ UNITS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
GET    /units                                  â†’ All active units
GET    /units?type=WEIGHT                      â†’ Filter by type
POST   /admin/units                            â†’ Add unit
PUT    /admin/units/:id                        â†’ Update unit
PUT    /admin/units/:id/toggle                 â†’ Enable/disable
POST   /admin/units/:id/translations           â†’ Add unit translation

// â”€â”€â”€ PUBLIC (frontend) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
GET    /categories                             â†’ Tree (active only, with translations)
GET    /categories/:id/product-types           â†’ Product types in category
GET    /product-types/:id/attributes           â†’ Attributes + options for listing form
```

### Seed Data for Pakistan (initial catalog):

```typescript
// Categories with Urdu + English translations:

const catalogSeed = [
  {
    slug: 'metals', en: 'Metals', ur: 'Ø¯Ú¾Ø§ØªÛŒÚº', colorHex: '#F59E0B',
    children: [
      { slug: 'copper', en: 'Copper', ur: 'ØªØ§Ù†Ø¨Ø§',
        types: [
          { slug: 'copper-wire', en: 'Copper Wire', ur: 'ØªØ§Ù†Ø¨Û’ Ú©ÛŒ ØªØ§Ø±' },
          { slug: 'copper-sheet', en: 'Copper Sheet', ur: 'ØªØ§Ù†Ø¨Û’ Ú©ÛŒ Ú†Ø§Ø¯Ø±' },
        ]
      },
      { slug: 'silver', en: 'Silver', ur: 'Ú†Ø§Ù†Ø¯ÛŒ' },
      { slug: 'iron', en: 'Iron', ur: 'Ù„ÙˆÛØ§',
        types: [
          { slug: 'iron-scrap', en: 'Iron Scrap', ur: 'Ù„ÙˆÛÛ’ Ú©Ø§ Ú©Ø¨Ø§Ú‘' },
          { slug: 'steel-rods', en: 'Steel Rods', ur: 'Ø³Ø±ÛŒØ§' },
        ]
      },
    ]
  },
  {
    slug: 'plastics', en: 'Plastics', ur: 'Ù¾Ù„Ø§Ø³Ù¹Ú©', colorHex: '#3B82F6',
    children: [
      { slug: 'plastic-bags', en: 'Plastic Bags', ur: 'Ù¾Ù„Ø§Ø³Ù¹Ú© Ú©Û’ ØªÚ¾ÛŒÙ„Û’' },
      { slug: 'plastic-bottles', en: 'Plastic Bottles', ur: 'Ù¾Ù„Ø§Ø³Ù¹Ú© Ú©ÛŒ Ø¨ÙˆØªÙ„ÛŒÚº' },
    ]
  },
  { slug: 'paper', en: 'Paper & Cardboard', ur: 'Ú©Ø§ØºØ° Ø§ÙˆØ± Ú¯ØªÛ', colorHex: '#10B981',
    children: [
      { slug: 'paper-waste', en: 'Paper Waste', ur: 'Ø±Ø¯ÛŒ Ú©Ø§ØºØ°' },
      { slug: 'hardboard', en: 'Hardboard', ur: 'Ú¯ØªÛ' },
    ]
  },
  { slug: 'electronics', en: 'Electronics', ur: 'Ø§Ù„ÛŒÚ©Ù¹Ø±Ø§Ù†Ú©Ø³', colorHex: '#8B5CF6',
    children: [
      { slug: 'electronic-scrap', en: 'Electronic Scrap', ur: 'Ø§Ù„ÛŒÚ©Ù¹Ø±Ø§Ù†Ú© Ú©Ø¨Ø§Ú‘' },
      { slug: 'waste-wires', en: 'Waste Wires', ur: 'Ø¨ÛŒÚ©Ø§Ø± ØªØ§Ø±ÛŒÚº' },
    ]
  },
  { slug: 'organic', en: 'Organic', ur: 'Ù†Ø§Ù…ÛŒØ§ØªÛŒ', colorHex: '#EF4444',
    children: [
      { slug: 'bones', en: 'Bones', ur: 'ÛÚˆÛŒØ§Úº' },
      { slug: 'hairs', en: 'Hair', ur: 'Ø¨Ø§Ù„' },
    ]
  },
  { slug: 'furniture', en: 'Furniture', ur: 'ÙØ±Ù†ÛŒÚ†Ø±', colorHex: '#F97316' },
  { slug: 'household', en: 'Household Items', ur: 'Ú¯Ú¾Ø±ÛŒÙ„Ùˆ Ø§Ø´ÛŒØ§Ø¡', colorHex: '#06B6D4',
    children: [
      { slug: 'home-items', en: 'Home Items', ur: 'Ú¯Ú¾Ø± Ú©ÛŒ Ø§Ø´ÛŒØ§Ø¡' },
      { slug: 'office-items', en: 'Office Items', ur: 'Ø¯ÙØªØ±ÛŒ Ø§Ø´ÛŒØ§Ø¡' },
    ]
  },
  { slug: 'glass', en: 'Glass', ur: 'Ø´ÛŒØ´Û', colorHex: '#64748B' },
  { slug: 'silver-box', en: 'Silver Box', ur: 'Ø³Ù„ÙˆØ± Ø¨Ø§Ú©Ø³', colorHex: '#94A3B8' },
];

// Units seed (with Urdu translations):
const unitsSeed = [
  { slug: 'kg', type: 'WEIGHT', en: { name: 'Kilogram', abbr: 'kg' }, ur: { name: 'Ú©Ù„ÙˆÚ¯Ø±Ø§Ù…', abbr: 'Ú©Ù„Ùˆ' } },
  { slug: 'ton', type: 'WEIGHT', en: { name: 'Ton', abbr: 't' }, ur: { name: 'Ù¹Ù†', abbr: 'Ù¹Ù†' } },
  { slug: 'gram', type: 'WEIGHT', en: { name: 'Gram', abbr: 'g' }, ur: { name: 'Ú¯Ø±Ø§Ù…', abbr: 'Ú¯Ø±Ø§Ù…' } },
  { slug: 'piece', type: 'COUNT', en: { name: 'Piece', abbr: 'pcs' }, ur: { name: 'Ø¹Ø¯Ø¯', abbr: 'Ø¹Ø¯Ø¯' } },
  { slug: 'liter', type: 'VOLUME', en: { name: 'Liter', abbr: 'L' }, ur: { name: 'Ù„ÛŒÙ¹Ø±', abbr: 'Ù„Ù¹Ø±' } },
  { slug: 'bundle', type: 'COUNT', en: { name: 'Bundle', abbr: 'bdl' }, ur: { name: 'Ú¯Ù¹Ú¾Ø§', abbr: 'Ú¯Ù¹Ú¾Ø§' } },
  { slug: 'bag', type: 'COUNT', en: { name: 'Bag', abbr: 'bag' }, ur: { name: 'Ø¨ÙˆØ±ÛŒ', abbr: 'Ø¨ÙˆØ±ÛŒ' } },
  { slug: 'truck-load', type: 'COUNT', en: { name: 'Truck Load', abbr: 'truck' }, ur: { name: 'Ù¹Ø±Ú© Ø¨Ú¾Ø±', abbr: 'Ù¹Ø±Ú©' } },
];
```

---

## ðŸ’³ MODULE E â€” PAKISTAN PAYMENT GATEWAYS

### Supported Gateways (Pakistan-first):

```prisma
model CountryPaymentGateway {
  id          String    @id @default(uuid())
  countryId   String
  country     Country   @relation(fields: [countryId], references: [id])
  gateway     PaymentGateway
  isActive    Boolean   @default(true)
  config      Json      // gateway-specific credentials (encrypted)
  displayName String    // "JazzCash", "Easypaisa"
  logoUrl     String?
  sortOrder   Int       @default(0)
}

enum PaymentGateway {
  JAZZCASH       // Pakistan mobile wallet
  EASYPAISA      // Pakistan mobile wallet
  STRIPE         // International cards
  RAZORPAY       // Future: India expansion
  BANK_TRANSFER  // Manual bank transfer (with receipt upload)
  WALLET         // Platform internal wallet
}
```

### JazzCash Integration:

```typescript
// /modules/payments/gateways/jazzcash.service.ts
// JazzCash REST API v2.0

async initiatePayment(amount: number, phone: string, txRef: string) {
  // POST to JazzCash sandbox/production endpoint
  // Amount in PKR (integer)
  // HMAC-SHA256 signature generation
  // Returns: payment URL or MPIN push to phone
}

async verifyPayment(txRef: string): Promise<boolean> {
  // Verify via JazzCash inquiry API
  // Update wallet/subscription on success
}
```

### Easypaisa Integration:

```typescript
// /modules/payments/gateways/easypaisa.service.ts
// Telenor Easypaisa API

async initiatePayment(amount: number, msisdn: string, orderId: string) {
  // POST to Easypaisa payment endpoint
  // AES-128 encrypted payload
  // Returns: transaction reference
}
```

### Payment Endpoints:

```
POST /payments/jazzcash/initiate       â†’ Start JazzCash payment
POST /payments/jazzcash/callback       â†’ JazzCash IPN webhook
POST /payments/easypaisa/initiate      â†’ Start Easypaisa payment
POST /payments/easypaisa/callback      â†’ Easypaisa IPN webhook
POST /payments/stripe/create-intent    â†’ Stripe PaymentIntent
POST /payments/stripe/webhook          â†’ Stripe webhook
POST /payments/bank-transfer/submit    â†’ Submit bank transfer receipt
PUT  /admin/payments/bank-transfer/:id â†’ Admin verify bank transfer
GET  /payments/history                 â†’ User payment history (in PKR + formatted)
```

---

## ðŸ“‹ UPDATED LISTING MODEL (with dynamic catalog links)

```prisma
model Listing {
  id                String                  @id @default(uuid())
  title             String
  description       String
  
  // â”€â”€â”€ Dynamic catalog references â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  categoryId        String
  category          Category                @relation(fields: [categoryId], references: [id])
  productTypeId     String?
  productType       ProductType?            @relation(fields: [productTypeId], references: [id])
  attributeValues   ListingAttributeValue[]
  
  // â”€â”€â”€ Pricing (stored as integer, currency tracked) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  pricePaisa        BigInt                  // Always stored in smallest unit
  currencyId        String                  @default("PKR")
  currency          Currency                @relation(fields: [currencyId], references: [id])
  priceNegotiable   Boolean                 @default(true)
  
  // â”€â”€â”€ Quantity & Unit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  quantity          Decimal                 @db.Decimal(12,3)
  unitId            String
  unit              Unit                    @relation(fields: [unitId], references: [id])
  minOrderQuantity  Decimal?                @db.Decimal(12,3)
  
  // â”€â”€â”€ Seller & Location â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sellerId          String
  seller            User                    @relation(fields: [sellerId], references: [id])
  geoZoneId         String
  geoZone           GeoZone                 @relation(fields: [geoZoneId], references: [id])
  latitude          Float
  longitude         Float
  address           String?
  cityName          String?
  countryId         String                  @default("PK")
  country           Country                 @relation(fields: [countryId], references: [id])
  contactNumber     String?
  
  // â”€â”€â”€ Status & Visibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  status            ListingStatus           @default(ACTIVE)
  visibilityLevel   VisibilityLevel         @default(LOCAL)
  
  // â”€â”€â”€ Media â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  images            ListingImage[]
  
  // â”€â”€â”€ Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  viewCount         Int                     @default(0)
  interestedCount   Int                     @default(0)
  
  // â”€â”€â”€ Relations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  escalationHistory EscalationLog[]
  transactions      Transaction[]
  
  expiresAt         DateTime?
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
}
```

---

## ðŸ” MODULE 1 â€” AUTHENTICATION (Pakistan Phone Format)

```
Endpoints:
POST /auth/register
POST /auth/login
POST /auth/otp/send          â†’ Validate +92 format before sending
POST /auth/otp/verify
POST /auth/refresh-token
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/2fa/enable
POST /auth/2fa/verify
GET  /auth/me
```

**Pakistan-specific:**
- Phone validation regex: `/^(\+92|0)?3[0-9]{9}$/`
- OTP SMS via Twilio with Pakistani number support (+92 prefix normalization)
- Default user language: `ur` (Urdu)
- Default user currency: `PKR`
- CNIC format validation for KYC: `XXXXX-XXXXXXX-X`

**Add to User model:**
```prisma
model User {
  // ... existing fields ...
  languageId      String    @default("ur")
  language        Language  @relation("UserLanguage", fields: [languageId], references: [id])
  currencyId      String    @default("PKR")
  currency        Currency  @relation(fields: [currencyId], references: [id])
  countryId       String    @default("PK")
  country         Country   @relation(fields: [countryId], references: [id])
  cnicNumber      String?   // For Pakistani KYC
  city            String?   // Karachi, Lahore, Islamabad, etc.
}
```

---

## ðŸŒ MODULE 3 â€” GEO-ZONES (Pakistan Cities)

### Seed Pakistan zones:

```typescript
// Provincial level
const provinces = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Gilgit-Baltistan', 'AJK'];

// City level (under provinces)
const cities = {
  Punjab: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Multan', 'Sialkot'],
  Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana'],
  KPK: ['Peshawar', 'Abbottabad', 'Mardan', 'Swat'],
  Balochistan: ['Quetta', 'Gwadar', 'Turbat'],
};

// Local zones within cities (e.g., Karachi areas)
const karachiAreas = [
  'Korangi Industrial Area', 'SITE Industrial Area', 'Lyari',
  'Saddar', 'Orangi Town', 'Landhi', 'North Karachi',
  'Gulshan-e-Iqbal', 'Malir', 'Baldia Town'
];
```

---

## ðŸ–¥ï¸ ADMIN PORTAL â€” CATALOG MANAGEMENT PAGES

Add these pages to the Admin Portal:

```
/catalog                           â†’ Catalog overview dashboard
/catalog/categories                â†’ Category tree manager (drag-drop reorder)
/catalog/categories/new            â†’ Create category + upload icon + add translations
/catalog/categories/:id            â†’ Edit category + manage translations (EN/UR inline)
/catalog/product-types             â†’ All product types (filterable by category)
/catalog/product-types/new         â†’ Create product type + translations
/catalog/product-types/:id         â†’ Edit + manage attributes
/catalog/product-types/:id/attributes â†’ Attribute builder (drag-drop, input type selector)
/catalog/units                     â†’ Unit manager + translations
/catalog/units/new                 â†’ Add unit
/languages                         â†’ Language manager
/languages/:id/translations        â†’ Inline translation editor (table with EN/UR columns)
/languages/:id/export              â†’ Export translations as JSON
/currencies                        â†’ Currency list + exchange rates
/currencies/:id/rates              â†’ Rate history chart + manual update
/countries                         â†’ Country config (future expansion)
/payments/gateways                 â†’ Payment gateway config per country
```

### Key Admin Catalog Components:

```
<CategoryTreeEditor />
  â†’ Drag-and-drop tree (react-sortable-tree or dnd-kit)
  â†’ Inline edit name in both EN and UR side by side
  â†’ Toggle active/inactive per row
  â†’ Color picker for category color
  â†’ Icon upload

<ProductTypeAttributeBuilder />
  â†’ Visual attribute builder
  â†’ Drag to reorder attributes
  â†’ For each attribute: set type (SELECT/TEXT/NUMBER/BOOLEAN), required toggle
  â†’ Add/remove options for SELECT type
  â†’ Preview how listing form will look

<TranslationEditor />
  â†’ Table: Key | English | Urdu | (Future Language)
  â†’ Inline editable cells
  â†’ Search/filter by namespace
  â†’ Import/export JSON
  â†’ Show missing translations highlighted in red

<CurrencyRateManager />
  â†’ Current rates table
  â†’ Manual rate entry form
  â†’ Rate history line chart (Recharts)
  â†’ "Sync from API" button

<PaymentGatewayConfig />
  â†’ Per-country gateway list
  â†’ Enable/disable toggle per gateway
  â†’ Secure credential entry (masked fields)
  â†’ Test connection button
```

---

## ðŸ“± MOBILE APP â€” Localization & Pakistan UX

### Flutter Localization Setup:

```dart
// pubspec.yaml additions
dependencies:
  easy_localization: ^3.x
  flutter_localizations:
    sdk: flutter
  intl: ^x.x

// assets:
//   - assets/translations/en.json
//   - assets/translations/ur.json
//   - assets/fonts/JameelNooriNastaleeq.ttf   â† Urdu font
//   - assets/fonts/Inter-Regular.ttf
```

```dart
// main.dart
void main() async {
  await EasyLocalization.ensureInitialized();
  runApp(
    EasyLocalization(
      supportedLocales: [Locale('en'), Locale('ur')],
      path: 'assets/translations',
      fallbackLocale: Locale('en'),
      child: MyApp(),
    ),
  );
}

// Language switcher in Settings screen
// Urdu: use Directionality(textDirection: TextDirection.rtl, child: ...)
// Dynamic fetch of translations from API on version change
// Format PKR prices: NumberFormat('#,##0', 'ur_PK').format(amount)
// Format dates: DateFormat.yMMMd('ur').format(date) â†’ "Û±Ûµ Ø¬Ù†ÙˆØ±ÛŒ Û²Û°Û²Ûµ"
```

### Pakistan-specific UX in Mobile:

- Phone input: pre-fill `+92`, format as `0300-1234567`
- Price display: `â‚¨ 1,500` in English; `â‚¨ Û±Ù«ÛµÛ°Û°` in Urdu
- Use Urdu numerals (Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©) when language is Urdu
- Map default region: Pakistan (lat: 30.3753, lng: 69.3451, zoom 5)
- Default city picker: Pakistan cities from seed list
- JazzCash/Easypaisa shown first in payment options
- CNIC field in KYC with format mask `XXXXX-XXXXXXX-X`

---

## âš™ï¸ PLATFORM CONFIGURATION â€” Pakistan Defaults

Extend the `PlatformConfig` table seed:

| Key | Default | Label |
|---|---|---|
| `default_country` | `PK` | Default Country |
| `default_currency` | `PKR` | Default Currency |
| `default_language` | `ur` | Default Language |
| `default_timezone` | `Asia/Karachi` | Default Timezone |
| `price_storage_unit` | `paisa` | Price storage unit (paisa/cents) |
| `primary_payment_gateway` | `JAZZCASH` | Primary payment gateway |
| `secondary_payment_gateway` | `EASYPAISA` | Secondary payment gateway |
| `sms_provider` | `TWILIO` | SMS provider |
| `phone_country_code` | `+92` | Default phone country code |
| `kyc_document_type` | `CNIC` | KYC document label |
| `cnic_validation_enabled` | `true` | Validate CNIC format |
| `supported_languages` | `ur,en` | Comma-separated active language IDs |
| `escalation_phase2_days` | `3` | Days before neighbor escalation |
| `escalation_phase3_days` | `7` | Days before city escalation |
| `escalation_phase4_days` | `14` | Days before public visibility |
| `interest_threshold` | `5` | Interests before escalation |
| `local_dealer_capacity_kg` | `500` | Max kg before bulk override |
| `max_images_per_listing` | `5` | Max images per listing |
| `bond_expiry_hours` | `24` | Bond download link expiry |
| `otp_expiry_seconds` | `300` | OTP TTL |
| `subscription_grace_days` | `2` | Grace period after expiry |
| `price_suggestion_enabled` | `true` | Enable AI price suggestions |
| `catalog_version_hash` | `v1` | Increment to force mobile translation refresh |

---

## ðŸ§® CURRENCY DISPLAY INTERCEPTOR

Build a global `CurrencyResponseInterceptor` in NestJS:

```typescript
// Automatically transforms all price fields in API responses
// Converts BigInt paisa values to formatted display strings
// Adds both raw (pricePaisa) and formatted (priceFormatted) fields
// Respects Accept-Currency header or user.currencyId

@Injectable()
export class CurrencyResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.transformPrices(data, requestedCurrency))
    );
  }

  // pricePaisa: 150000 â†’ priceFormatted: "â‚¨ 1,500" (PKR)
  // pricePaisa: 150000 â†’ priceFormatted: "$5.40" (USD, via exchange rate)
}
```

---

## ðŸ—ƒï¸ COMPLETE PRISMA SEED ORDER

Run seeds in this exact order:

```
1. Languages (ur, en + stubs for ar, zh, tr)
2. Currencies (PKR default + USD, AED, SAR, GBP as inactive)
3. Countries (PK default + stubs for AE, SA, GB)
4. CountryCurrency links
5. CountryLanguage links
6. Units + UnitTranslations
7. Categories + CategoryTranslations (full Pakistan catalog above)
8. ProductTypes + ProductTypeTranslations
9. ProductAttributes + options + translations (per product type)
10. PlatformConfig (all keys above)
11. Translation strings (all namespaces, EN + UR)
12. SubscriptionPlans (PKR pricing)
13. GeoZones (Pakistan provinces â†’ cities â†’ local areas)
14. Super Admin user account
15. Sample dealer/franchise accounts
16. Sample listings (10 listings across categories)
17. CountryPaymentGateway (JazzCash, Easypaisa, Stripe for PK)
```

---

## ðŸš€ ADDITIONAL PAKISTAN-SPECIFIC FEATURES

### 1. CNIC Verification Stub:
```typescript
// /modules/kyc/cnic.service.ts
// Interface for NADRA CNIC verification API
// Validate format: /^\d{5}-\d{7}-\d{1}$/
// Stub: accept any valid format, mark as MANUAL_REVIEW
// Design interface so real NADRA API can be plugged in later
```

### 2. Urdu Number Formatting:
```typescript
// /common/utils/number-format.util.ts
const urduNumerals = ['Û°','Û±','Û²','Û³','Û´','Ûµ','Û¶','Û·','Û¸','Û¹'];
function toUrduNumerals(n: number): string {
  return String(n).replace(/[0-9]/g, d => urduNumerals[parseInt(d)]);
}
// Use in CurrencyService.format() when language === 'ur'
```

### 3. Pakistan City Autocomplete:
```typescript
// /common/data/pakistan-cities.ts
// Comprehensive list of Pakistan cities with coordinates
// Used in: listing location picker, user profile, zone selection
// Preloaded in app (no API call needed)
```

### 4. Pakistani Holidays / Business Days:
```typescript
// /common/utils/pk-calendar.ts
// Public holidays list for Pakistan
// Used in: subscription expiry calculations (grace days on holidays)
// Used in: escalation engine (pause escalation on holidays)
```

---

## ðŸ§ª TESTING â€” Pakistan-specific

```typescript
// /test/pakistan.e2e-spec.ts
describe('Pakistan Market Tests', () => {
  it('should validate Pakistani phone numbers (+92)')
  it('should validate CNIC format')
  it('should return prices in PKR by default')
  it('should return Urdu translations when Accept-Language: ur')
  it('should place Karachi inside correct geo-zone')
  it('should process JazzCash payment flow')
  it('should format currency with Urdu numerals when locale=ur')
  it('should list categories with Urdu names when lang=ur')
})
```

---

## ðŸ“‹ UPDATED ENV VARIABLES

```env
# Pakistan defaults
DEFAULT_COUNTRY=PK
DEFAULT_CURRENCY=PKR
DEFAULT_LANGUAGE=ur
DEFAULT_TIMEZONE=Asia/Karachi
DEFAULT_PHONE_CODE=+92

# JazzCash
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
JAZZCASH_ENV=sandbox           # sandbox | production
JAZZCASH_RETURN_URL=

# Easypaisa
EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=
EASYPAISA_ENV=sandbox

# Twilio (Pakistan)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=           # Must support Pakistan +92

# Open Exchange Rates (for currency conversion)
OPEN_EXCHANGE_RATES_APP_ID=
EXCHANGE_RATE_SYNC_INTERVAL=3600000   # 1 hour

# Catalog
CATALOG_VERSION_HASH=v1        # Increment to force mobile refresh

# ... (all previous env variables remain)
```

---

## âœ… FINAL EXECUTION ORDER (UPDATED)

```
Phase 1 â€” Foundation
  1. Monorepo + Docker + PostgreSQL/PostGIS + Redis
  2. NestJS scaffold + all module stubs
  3. Complete Prisma schema (all models above)
  4. Run migrations
  5. Complete seed script (in order defined above)

Phase 2 â€” Localization Infrastructure
  6. Language module (CRUD + translation table)
  7. Currency module (CRUD + exchange rates + formatter)
  8. Country module + payment gateway config
  9. i18n middleware (Accept-Language â†’ req.lang)
  10. CurrencyResponseInterceptor

Phase 3 â€” Dynamic Catalog
  11. Category module (tree CRUD + translations)
  12. ProductType module (CRUD + translations)
  13. ProductAttribute + options (EAV engine)
  14. Unit module (CRUD + translations)
  15. PriceHistory service

Phase 4 â€” Core Backend
  16. Auth module (JWT + OTP + CNIC validation)
  17. User + KYC (CNIC format, Pakistani phone)
  18. Geo-zones (Pakistan zones seeded)
  19. Listings (dynamic catalog, PKR pricing, attributes)
  20. Escalation Engine (Bull Queue)
  21. Subscriptions + Payments (JazzCash + Easypaisa + Stripe)
  22. Transactions + Bond/PDF (Urdu + English PDF template)
  23. Chat (Socket.io)
  24. Notifications (Urdu + English templates)
  25. Analytics
  26. Audit logs + security

Phase 5 â€” Admin Portal
  27. React scaffold + react-i18next + RTL support
  28. Dashboard + analytics
  29. User + KYC management
  30. Geo-zone map editor
  31. Catalog manager (categories, types, attributes, units)
  32. Translation editor (inline EN/UR table)
  33. Currency + exchange rate manager
  34. Payment gateway config
  35. Subscription plans + platform config
  36. Audit log viewer

Phase 6 â€” Client Portal
  37. React scaffold + Urdu RTL support
  38. Auth + language/currency switcher
  39. Listing browse (map + list, PKR prices)
  40. Create listing (dynamic attribute form from catalog)
  41. Negotiation + bond viewer (Urdu/English)
  42. Subscription + JazzCash/Easypaisa wallet

Phase 7 â€” Mobile App
  43. Flutter scaffold + easy_localization + Urdu font
  44. Auth (Pakistani phone format)
  45. Dynamic listing form (fetches attributes from API)
  46. Dealer/franchise flows
  47. JazzCash + Easypaisa in-app payment
  48. Push notifications (Urdu text)
  49. Android + iOS build configs
```

---

## ðŸŽ¯ FINAL CURSOR AI INSTRUCTIONS

1. **Pakistan is default** â€” every default value, seed, and config must use PK/PKR/ur unless explicitly specified otherwise
2. **No hardcoded categories** â€” all product types, categories, attributes, units come from DB; admin manages them entirely via portal
3. **No hardcoded prices** â€” always stored as BigInt (paisa), always displayed via CurrencyService
4. **No hardcoded strings** â€” all user-facing text goes through i18n Translation table
5. **RTL support mandatory** â€” every UI component must work in both LTR (English) and RTL (Urdu)
6. **JazzCash/Easypaisa first** â€” list Pakistani payment methods before Stripe in all UI
7. **Currency interceptor** â€” every API response with monetary values must include both raw (`pricePaisa`) and formatted (`priceFormatted`) fields
8. **Translation fallback** â€” always fall back to English if Urdu translation key is missing
9. **Extensibility over hardcoding** â€” whenever you add a new language, currency, category, or country, it must require only DB inserts, zero code changes
10. **All other previous instructions remain in effect** â€” TypeScript strict, Prisma transactions, Swagger docs, pagination, error format, folder structure
```

