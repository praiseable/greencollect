# Kabariya Spec — Implementation Summary

This document summarizes the requirements from `kabariya-complete-spec.md` that have been implemented in the existing stack (Express + Prisma backend, Flutter mobile, React web-admin).

## Backend (Express + Prisma)

### 1. Standard API response envelope
- **File:** `backend/src/utils/apiResponse.js`
- **Helpers:** `success(data)`, `paginated(items, meta)`, `error(message, code, errors)`
- Used in new config, listing favorites/reports, and health response.

### 2. Health check (spec 5.5)
- **Route:** `GET /health`
- **Response:** `{ status: 'ok', uptime, timestamp, db: 'connected'|'error' }`
- Database connectivity is checked via `prisma.$queryRaw`.

### 3. App version config (spec 2.4)
- **Route:** `GET /api/config/app-version?platform=android|ios` (also under `/v1/config`)
- **Response:** `{ success: true, data: { minVersion, latestVersion, forceUpdate } }`
- Reads from `PlatformConfig` (keys `app_version_android`, `app_version_ios`). Seed adds default `1.0.0` / `forceUpdate: false`.

### 4. Listing favorites (spec 2.7)
- **Models:** `ListingFavorite` (userId, listingId, unique), and `Listing` gains `favorites` relation.
- **Routes:**
  - `GET /api/listings/favorites` — paginated list of current user’s favourited listings (auth required).
  - `POST /api/listings/:id/favorite` — toggle favourite; returns `{ success: true, data: { favorited: true|false } }`.

### 5. Listing reports and auto-flag (spec 2.7)
- **Models:** `ListingReport` (listingId, reporterId, reason, status), and `Listing` gains `isFlagged`, `flagCount`, `reports` relation.
- **Route:** `POST /api/listings/:id/report` — body `{ reason }` (min 5 chars). One report per user per listing.
- When report count for a listing reaches 5, the listing is set to `isFlagged: true`, `flagCount: 5`, and admins are notified via Socket.io.

### 6. OTP enhancements (spec 2.4)
- **Suspended user:** On `POST /auth/otp/send`, if user exists and `accountStatus` is `SUSPENDED` or `REJECTED`, respond with **403** and `ACCOUNT_SUSPENDED`.
- **Lockout:** After 5 failed `POST /auth/otp/verify` attempts (wrong code), the phone is locked for 15 minutes. Response **423** with `OTP_LOCKED` and `lockedUntil`.
- **Resend cooldown:** After sending OTP, the same phone cannot request a new OTP for 60 seconds; **429** with `OTP_COOLDOWN` and `cooldownSeconds`.
- **Store:** `backend/src/utils/otpStore.js` (in-memory). Optional: replace with Redis for multi-instance.

### 7. Database migrations
- **Prisma schema:** New models `ListingFavorite`, `ListingReport`; `Listing` extended with `isFlagged`, `flagCount`, and relations; `User` with `listingFavorites`, `listingReports`.
- **Apply:** Run `npx prisma migrate dev` (or `npx prisma db push` if you don’t use migrations) then `npx prisma generate` and `npm run seed` to seed app version keys.

## Mobile (Flutter)

- **App version:** `ApiService.getAppVersion(platform)` calls `GET /v1/config/app-version?platform=android|ios`. Can be used from splash to show a force-update screen when `forceUpdate` is true.
- **Favorites:** `ApiService.getListingsFavorites()` and `ApiService.toggleListingFavorite(listingId)` added. Listing detail screen favourite button now calls the API and shows filled/outline heart and snackbar.

## Web admin

- No code changes required for app-version or health; backend routes are under `/api/config` and `/health`. Optional: add a “System health” or “App version” panel that calls these endpoints.

## Pending / optional (from full spec)

- **Knex → Prisma:** Spec assumes Knex migrations; this project uses Prisma. All new behaviour is implemented with Prisma.
- **React Native → Flutter:** Spec describes React Native mobile; this project uses Flutter. Behaviour (favorites, app version) is implemented in Flutter.
- **Next.js portal → React (Vite) web-admin:** Spec describes a Next.js admin portal; this project uses the existing web-admin. New backend routes work with the current admin.
- **Offers/Disputes/Wallet ledger:** Spec has detailed offers, disputes, wallet_ledger, withdrawal_requests. The codebase already has Transaction, Payment, Wallet; full offer/negotiation flow and dispute resolution can be added on top of existing models.
- **Redis for OTP lockout:** Currently in-memory; for production with multiple instances, use Redis with keys `otp_lock:<phone>` and cooldown.

## Quick test

1. **Backend:** `cd backend && npm run dev`.  
   - `GET http://localhost:4000/health` → `{ status: 'ok', db: '...' }`.  
   - `GET http://localhost:4000/api/config/app-version?platform=android` → `{ success: true, data: { minVersion, latestVersion, forceUpdate } }`.
2. **Favorites (auth required):** `GET /api/listings/favorites`, `POST /api/listings/:id/favorite`.
3. **Report:** `POST /api/listings/:id/report` with body `{ "reason": "Inappropriate content" }`.
4. **OTP:** Send OTP, then verify with wrong code 5 times; next send for that phone should return 423 until lockout expires.
