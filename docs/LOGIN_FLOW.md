# Phone Login Flow (Mobile & Backend)

## Overview

1. **User enters phone** on LoginScreen (e.g. `03001234567` or `+92 300 123 4567`).
2. **Tap "Send OTP"** → app normalizes phone (strips spaces/dashes), calls backend.
3. **Backend** validates phone, creates OTP, returns `{ success: true }`.
4. **App** navigates to OTP screen with `?phone=...` in URL.
5. **User enters 6-digit OTP** → app calls verify with normalized phone + OTP.
6. **Backend** returns `accessToken`, `refreshToken`, `user` → app stores and navigates to `/home`.

---

## 1. Send OTP

| Layer    | Detail |
|----------|--------|
| **Screen** | `apps/mobile/lib/features/auth/login_screen.dart` → `_sendOtp()` |
| **Provider** | `auth.provider.dart` → `sendOtp(phone)` |
| **Normalization** | `AuthProvider.normalizePhone(phone)` — strips spaces/dashes; output must match `(+92|0)?3[0-9]{9}` |
| **API** | `POST /v1/auth/otp/send` (mobile uses `ApiConfig.effectiveBaseUrl` = `https://gc.directconnect.services/v1`) |
| **Body** | `{ "phone": "03001234567" }` or `"+923001234567"` |
| **Backend** | `backend/src/routes/auth.routes.js` → `router.post('/otp/send', ...)` |
| **Validation** | Phone regex: `^(\+92|0)?3[0-9]{9}$` (no spaces). Returns 400 with `{ errors: [ { msg: "Invalid Pakistan phone number" } ] }` if invalid. |
| **Success** | 200 `{ success: true, message: "OTP sent", expiresIn: 300 }` |
| **Errors** | 403 suspended, 423 lockout, 429 cooldown |

**Why it can get stuck**

- **Phone format:** If user types `+92 3001234567` (with space), backend validation fails. The app now **normalizes** before sending (strip spaces/dashes) so `+92 3001234567` → `+923001234567`.
- **Network:** Request can hang if backend is unreachable. The app uses an **8s timeout** and a **10s safety timer** so the button stops spinning and shows "Request timed out. Check your connection."
- **Server error:** 4xx/5xx are parsed and shown (including validation `errors[0].msg` and `error.message`).

---

## 2. Verify OTP

| Layer    | Detail |
|----------|--------|
| **Screen** | `apps/mobile/lib/features/auth/otp_screen.dart` → `_verifyOtp()` |
| **Provider** | `auth.provider.dart` → `verifyOtp(phone, otp)` (phone normalized again) |
| **API** | `POST /v1/auth/otp/verify` |
| **Body** | `{ "phone": "03001234567", "otp": "123456" }` |
| **Backend** | Same auth.routes.js → `otpVerifyHandler`; accepts `code` or `otp`. |
| **Success** | 200 `{ success: true, user: {...}, accessToken, refreshToken }` |
| **App** | Saves tokens and user, sets `AuthStatus.authenticated`, then `context.go('/home')` in a post-frame callback so router sees updated auth. |

---

## 3. Backend base URL

- **Mobile:** `ApiConfig.baseUrl` = `https://gc.directconnect.services/v1` (see `apps/mobile/lib/config/api_config.dart`).
- **Backend mounts:** `app.use('/v1/auth', auth.routes)` so full path is `https://gc.directconnect.services/v1/auth/otp/send` and `/v1/auth/otp/verify`.

---

## 4. Quick checks if login still fails

1. **Phone format:** Use `03001234567` or `3001234567` (no spaces). App normalizes automatically.
2. **Backend up:** Open `https://gc.directconnect.services/v1/...` (or your health endpoint) in a browser or Postman.
3. **Error on screen:** After timeout or failure, the red error text under the button shows the backend message (e.g. "Invalid Pakistan phone number") or "Request timed out. Check your connection."
4. **OTP in dev:** Backend logs OTP to console when not in production: `OTP for +923001234567: 123456`.
