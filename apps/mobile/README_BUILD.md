# 📱 GreenCollect Mobile App - Build Instructions

## 🚀 Quick Start

### 1. Install Flutter
- Download: https://flutter.dev/docs/get-started/install/windows
- Add to PATH: `C:\src\flutter\bin`
- Verify: `flutter doctor`

### 2. Get Google Maps API Key
1. Go to: https://console.cloud.google.com/
2. Create project or select existing
3. Enable "Maps SDK for Android"
4. Create API key
5. Edit `android/app/src/main/AndroidManifest.xml` (line 44)
   - Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your key

### 3. Build APK

**Easy way (Windows):**
```bash
cd D:\gc-app\apps\mobile
build_apk.bat
```

**Manual way:**
```bash
cd D:\gc-app\apps\mobile
flutter clean
flutter pub get
flutter build apk --release
```

### 4. Find Your APK
- Location: `build/app/outputs/flutter-apk/app-release.apk`
- Size: ~30-50 MB

---

## 📋 Files Created

All Android configuration files have been created:
- ✅ `android/build.gradle` - Project build config
- ✅ `android/app/build.gradle` - App build config
- ✅ `android/app/src/main/AndroidManifest.xml` - App manifest
- ✅ `android/app/src/main/kotlin/.../MainActivity.kt` - Main activity
- ✅ `android/gradle.properties` - Gradle properties
- ✅ `build_apk.bat` - Windows build script

---

## ⚠️ Before Building

1. **Google Maps API Key** (Required)
   - Edit: `android/app/src/main/AndroidManifest.xml`
   - Line 44: Replace placeholder with your API key

2. **Flutter Installation**
   - Must be in PATH
   - Run `flutter doctor` to check setup

3. **Android SDK**
   - Install via Android Studio
   - Accept licenses: `flutter doctor --android-licenses`

---

## 📖 Documentation

- **Quick Build**: See `QUICK_BUILD.md`
- **Detailed Guide**: See `BUILD_ANDROID.md`
- **Troubleshooting**: See `BUILD_ANDROID.md#troubleshooting`

---

## 🔧 Build Options

**Debug APK** (for testing):
```bash
flutter build apk --debug
```

**Release APK** (for distribution):
```bash
flutter build apk --release
```

**Split APK** (smaller files per architecture):
```bash
flutter build apk --release --split-per-abi
```

**App Bundle** (for Play Store):
```bash
flutter build appbundle --release
```

---

## 📦 App Information

- **Package Name**: `com.greencollect.app`
- **Min SDK**: 21 (Android 5.0+)
- **Target SDK**: 34 (Android 14)
- **Version**: 1.0.0+1

---

## 🎯 Next Steps

1. ✅ Install Flutter
2. ✅ Get Google Maps API key
3. ✅ Update AndroidManifest.xml
4. ✅ Run `build_apk.bat`
5. ✅ Install APK on device
6. ✅ Test all features
7. ✅ Upload to Play Store (if ready)

---

**Need help?** Check the troubleshooting section in `BUILD_ANDROID.md`
