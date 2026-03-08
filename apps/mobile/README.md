# 📱 GreenCollect Mobile App (Flutter)

> Geo-Franchise Marketplace — Pakistan Edition | Android & iOS

---

## 📋 Overview

The GreenCollect mobile app is built with **Flutter** and provides a native Android/iOS experience for trading recyclable and reusable goods. It features OTP-based login, geo-fenced listings, a 5-step listing wizard, real-time chat, push notifications, and bilingual (Urdu/English) support.

---

## 🛠️ Tech Stack

| Component       | Technology                            |
|-----------------|---------------------------------------|
| Framework       | Flutter 3.x (Dart)                    |
| State Mgmt      | Riverpod                              |
| Navigation      | GoRouter (ShellRoute bottom nav)      |
| Localization    | easy_localization (en + ur RTL)       |
| Charts          | fl_chart                              |
| Local Storage   | shared_preferences                    |
| HTTP (future)   | dio                                   |

---

## 📁 Project Structure

```
apps/mobile/
├── android/                    # Android native config
│   ├── app/build.gradle        # minSdk 24, targetSdk 35
│   └── app/src/main/
│       ├── AndroidManifest.xml # Permissions, API keys
│       └── kotlin/.../         # MainActivity.kt
├── lib/
│   ├── main.dart               # App entry point
│   ├── core/
│   │   ├── mock/               # Mock data & mock service
│   │   ├── models/             # User, Listing, Notification, etc.
│   │   ├── providers/          # Riverpod: auth, notifications
│   │   ├── router/             # GoRouter config
│   │   └── theme/              # Colors, typography, spacing
│   └── features/
│       ├── splash/             # Splash screen
│       ├── onboarding/         # 3-slide onboarding
│       ├── auth/               # Login, OTP, Register, KYC
│       ├── home/               # Home screen
│       ├── listings/           # Browse, Detail, Create (5-step wizard)
│       ├── notifications/      # Notifications with routing
│       ├── profile/            # Profile, Edit Profile
│       ├── transactions/       # Transactions, Negotiation, Bond Viewer
│       ├── subscription/       # Subscription plans
│       ├── wallet/             # Wallet & recharge
│       ├── chat/               # Real-time chat
│       ├── analytics/          # Dealer analytics
│       ├── settings/           # Language, notifications, logout
│       └── shell/              # Bottom nav (ShellRoute)
├── assets/
│   └── translations/           # en.json, ur.json
├── pubspec.yaml                # Dependencies
└── README.md                   # This file
```

---

## 🚀 Prerequisites

1. **Flutter SDK ≥ 3.16** — [Install Flutter](https://flutter.dev/docs/get-started/install/windows)
   ```powershell
   flutter doctor -v
   ```
2. **Android SDK** — Install via Android Studio
   ```powershell
   flutter doctor --android-licenses
   ```
3. **Java JDK 17+** — [Download](https://adoptium.net/)
4. **Android device or emulator** — API 24+ (Android 7.0+)

---

## ⚡ Quick Start

### 1. Install dependencies

```powershell
cd D:\gc-app\apps\mobile
flutter pub get
```

### 2. Connect a device or start an emulator

```powershell
# Check connected devices
adb devices

# OR start an emulator
emulator -list-avds
emulator -avd <avd_name>
```

### 3. Run the app

```powershell
# Debug mode (hot-reload enabled)
flutter run

# Target a specific device
flutter run -d emulator-5554
flutter run -d <device-serial>
```

---

## 📦 Build APK

### Debug APK (for testing)

```powershell
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

### Release APK (for distribution)

```powershell
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Split APK (smaller per-architecture)

```powershell
flutter build apk --release --split-per-abi
# Output: app-armeabi-v7a-release.apk, app-arm64-v8a-release.apk, app-x86_64-release.apk
```

### App Bundle (for Play Store)

```powershell
flutter build appbundle --release
```

### Install APK on device

```powershell
adb install build/app/outputs/flutter-apk/app-release.apk
```

---

## 🔑 Test Accounts (Mock Data)

| Role            | Phone         | OTP    |
|-----------------|---------------|--------|
| Customer        | 03001234567   | 123456 |
| Local Dealer    | 03219876543   | 654321 |
| City Franchise  | 03451112233   | 112233 |
| Wholesale       | 03334445566   | 445566 |

---

## 📱 App Screens

| Screen            | Route               | Description                                  |
|-------------------|---------------------|----------------------------------------------|
| Splash            | `/`                 | Logo animation, auth check                   |
| Onboarding        | `/onboarding`       | 3-slide intro (first-time only)              |
| Login             | `/auth/login`       | Phone + role, sends OTP                      |
| OTP               | `/auth/otp`         | 6-digit OTP verification                     |
| Register          | `/auth/register`    | Full name, phone, role, city                 |
| KYC               | `/auth/kyc`         | KYC document submission                      |
| Home              | `/home`             | Categories, latest listings, stats banner    |
| Browse            | `/listings`         | Search, category filters, sort, listing grid |
| Listing Detail    | `/listings/:id`     | Hero image, price, details, Call/Make Offer  |
| Create Listing    | `/create`           | 5-step wizard with location picker           |
| Notifications     | `/notifications`    | Tap to route to actual post/screen           |
| Profile           | `/profile`          | Stats, My Listings, menu links               |
| Edit Profile      | `/profile/edit`     | Update name, email, phone, city              |
| Transactions      | `/transactions`     | Active, Completed, Cancelled tabs            |
| Negotiation       | `/transactions/:id/negotiate` | Offer / counter-offer                |
| Bond Viewer       | `/transactions/:id/bond`      | Digital bond document               |
| Subscription      | `/subscription`     | Plans, payment methods                       |
| Wallet            | `/wallet`           | Balance, history, recharge                   |
| Chat              | `/chat`             | Real-time messaging with offer cards         |
| Analytics         | `/analytics`        | Charts: listings, deals, revenue             |
| Settings          | `/settings`         | Language, notifications, logout              |

---

## 🔧 Configuration

### Google Maps API Key

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_GOOGLE_MAPS_API_KEY_HERE"/>
```

### App Package

- **Package name**: `com.greencollect.app`
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 35

---

## 🔧 Troubleshooting

| Problem                  | Solution                                           |
|--------------------------|----------------------------------------------------|
| Flutter not found        | Add `C:\src\flutter\bin` to PATH, restart terminal |
| No devices found         | `adb kill-server && adb start-server`              |
| Build fails              | `flutter clean && flutter pub get`                 |
| Maps not showing         | Verify API key in AndroidManifest.xml              |
| Stuck on splash          | Force-stop app, `flutter run` again                |
| Embedding error          | Regenerate: `flutter create --platforms=android .`  |

---

## 🔗 Related Docs

- [Project README](../../README.md) — Overall project setup & deployment
- [Original Requirements](../../docs/prompts/cursor_prompt.md) — Full specification
- [Mobile App Prompt](../../docs/prompts/android_avd_prompt.md) — Flutter AVD build spec
- [User Manual](../../docs/USER_MANUAL.md) — End-user guide

---

**Package**: `com.greencollect.app`  
**Version**: 1.0.0+1  
**Last Updated**: March 2026
