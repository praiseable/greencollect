# Mobile M1 — Auth, Secure Session, Force Update, KYC Routing

## Scope

M1 covers:

- UC-AUTH-01 register with phone and OTP.
- UC-AUTH-02 login, token refresh, logout, suspended account UX.
- UC-AUTH-03 upgrade to Kabariya Pro role and route pending users to KYC.
- UC-AUTH-04 force update gate.
- UC-KYC-01 KYC submission.
- UC-KYC-02 KYC approved/rejected state.
- UC-KYC-03 optional NTN/STRN/business profile.

## Non-negotiable rules

- Tokens remain in `flutter_secure_storage`.
- A Pro seller must never be wallet-gated.
- KYC/tax fields must never block normal listing, browsing, deposit, chat, or transaction flows.
- Suspended users must be routed out of protected screens.
- Force update must override deep links.

## Unit test gates

- Phone normalization to `+923xxxxxxxxx`.
- OTP format validation.
- CNIC format validation.
- Optional NTN/STRN validation.
- Auth route guard for unauthenticated, suspended, force-update, Pro pending KYC, and approved Pro users.

## Integration gates

- Register -> OTP -> authenticated session.
- Login -> refresh -> logout.
- Pro role request -> pending KYC route.
- KYC rejection reason visible and resubmittable.
- KYC approval unlocks Pro dashboard.
- Optional tax fields persist and do not gate listing/deposit.
