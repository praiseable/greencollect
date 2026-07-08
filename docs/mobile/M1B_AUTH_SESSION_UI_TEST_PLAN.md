# Kabariya Mobile M1-B — Auth Screens + Secure Session Wiring

## Scope

M1-B wires the Auth/KYC contract into mobile UI and provider structure.

Covered use cases:

- UC-AUTH-01 Register with phone/password and OTP routing
- UC-AUTH-02 Login, refresh, logout, suspended account handling
- UC-AUTH-03 Upgrade to Kabariya Pro / role-aware KYC tracker
- UC-AUTH-04 Force update gate
- UC-KYC-01 Submit KYC
- UC-KYC-02 Approved/rejected KYC state
- UC-KYC-03 Optional tax/business profile fields

## Acceptance checklist

- Login/register screens validate Pakistan phone format.
- OTP uses a six-digit validation rule.
- Access/refresh tokens are persisted only through secure session storage.
- Logout clears access token, refresh token, and cached user.
- Force update route exists and uses a non-dismissible screen.
- Pro KYC routing remains role/KYC based, not wallet-balance based.
- Customer listing/seller flows are not KYC-gated.
- NTN/STRN/business type remain optional.
- No seller subscription or seller wallet gate is introduced.

## Test gate

```powershell
cd D:\gc-app\apps\mobile
flutter pub get
flutter test test/core

$analyzeLog = "D:\gc-app\apps\mobile\flutter_analyze_m1b.log"
cmd /c "flutter analyze --no-fatal-infos --no-fatal-warnings > `"$analyzeLog`" 2>&1"
Write-Host "FLUTTER_ANALYZE_EXIT_CODE=$LASTEXITCODE"
Select-String -Path $analyzeLog -Pattern "^\s*error\s+-"
```

The analyzer gate passes when exit code is 0 and there are no `error -` lines.
Warnings/info are tracked in M-LINT-01.
