# 📦 Kabariya App - Release APK Build Summary

**Build Date**: March 9, 2026  
**Build Type**: Release Mode  
**Flutter Version**: 3.16.0+  
**SDK Version**: >=3.2.0 <4.0.0

---

## ✅ APK Files Generated

### 1. Customer App (Kabariya)
- **File Name**: `app-customer-release.apk`
- **File Path**: `apps/mobile/build/app/outputs/flutter-apk/app-customer-release.apk`
- **File Size**: 53.3 MB (55,873,442 bytes)
- **Build Time**: March 9, 2026 1:58:00 AM
- **App Name**: Kabariya
- **Package**: `com.greencollect.app`
- **Target Audience**: General public users

### 2. Pro App (Kabariya Pro)
- **File Name**: `app-pro-release.apk`
- **File Path**: `apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk`
- **File Size**: 53.3 MB (55,889,838 bytes)
- **Build Time**: March 9, 2026 1:59:19 AM
- **App Name**: Kabariya Pro
- **Package**: `com.greencollect.app.pro`
- **Target Audience**: Dealers, Franchises, Wholesale buyers

---

## 📋 Installation Instructions

### Method 1: ADB (Recommended)
```bash
# Navigate to project root
cd D:\gc-app

# Install Customer APK
adb install -r apps/mobile/build/app/outputs/flutter-apk/app-customer-release.apk

# Install Pro APK
adb install -r apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk
```

### Method 2: Direct File Transfer
1. Copy APK files from:
   - `apps/mobile/build/app/outputs/flutter-apk/app-customer-release.apk`
   - `apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk`
2. Transfer to Android device via USB, email, or cloud storage
3. Open file manager on device
4. Tap on APK file
5. Allow "Install from unknown sources" if prompted
6. Tap "Install"

---

## 🔧 Build Commands Used

```bash
# Customer App
flutter build apk --release --flavor customer --dart-define=APP_VARIANT=customer

# Pro App
flutter build apk --release --flavor pro --dart-define=APP_VARIANT=pro
```

---

## ✨ Features Included in This Build

### ✅ Fixed Issues
- **Chat Window**: Now opens correctly from listing detail screen
- **Call Functionality**: Phone dialer opens when call button is pressed
- **Navigation**: Back button works correctly on all screens
- **Session Persistence**: User stays logged in after app restart
- **Image Upload**: Full image picker with camera/gallery support

### ✅ Core Features
- Logo branding (Kabariya/Kabariya Pro)
- Splash screen with app logo
- Login/Registration with OTP
- KYC registration flow (Pro users)
- Listing creation with image upload
- Area-bounded listings (Pro dealers)
- Collection tracking workflow
- Chat with offline-first storage
- Notifications system
- Transaction management
- Carbon credits tracking
- Dealer rating system
- Balance gate for Pro users
- Escalation logic for listings

---

## 📱 Device Requirements

- **Minimum Android Version**: API 24 (Android 7.0)
- **Target Android Version**: API 35 (Android 15)
- **Architecture**: arm64-v8a (64-bit ARM)
- **Storage**: ~60 MB for installation + data

---

## 🧪 Testing Accounts

See `TEST_USERS.md` for complete list of test accounts with:
- Phone numbers
- OTP codes
- User roles
- Test scenarios
- KYC status
- Balance information

---

## 📝 Notes

- Both APKs are signed with debug keys (for testing)
- For production release, configure proper signing keys
- APK size optimized with tree-shaking (MaterialIcons reduced by 98.9%)
- All dependencies are included in the APK
- No external runtime dependencies required

---

## 🚀 Next Steps

1. **Install APKs** on test devices
2. **Test with accounts** from `TEST_USERS.md`
3. **Verify all features** work correctly
4. **Report any issues** found during testing
5. **Configure production signing** before public release

---

**Build Status**: ✅ Success  
**APKs Ready**: ✅ Yes  
**Ready for Testing**: ✅ Yes
