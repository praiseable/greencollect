# 🚀 Quick APK Build Guide

## Prerequisites Check

1. **Flutter installed?**
   ```bash
   flutter --version
   ```
   If not: Download from https://flutter.dev/docs/get-started/install/windows

2. **Android SDK installed?**
   ```bash
   flutter doctor
   ```
   Install missing components via Android Studio

3. **Google Maps API Key?**
   - Get from: https://console.cloud.google.com/
   - Enable "Maps SDK for Android"
   - Add to: `android/app/src/main/AndroidManifest.xml` (line 50)

---

## Build APK (3 Steps)

### Option 1: Using Batch Script (Easiest)

```bash
cd D:\gc-app\apps\mobile
build_apk.bat
```

### Option 2: Manual Commands

```bash
cd D:\gc-app\apps\mobile
flutter clean
flutter pub get
flutter build apk --release
```

### Option 3: Split APK (Smaller Files)

```bash
flutter build apk --release --split-per-abi
```

---

## Output Location

- **Single APK**: `build/app/outputs/flutter-apk/app-release.apk`
- **Split APKs**: 
  - `app-armeabi-v7a-release.apk` (32-bit ARM)
  - `app-arm64-v8a-release.apk` (64-bit ARM)
  - `app-x86_64-release.apk` (64-bit x86)

---

## Important: Google Maps API Key

**Before building**, edit:
```
android/app/src/main/AndroidManifest.xml
```

Replace line 50:
```xml
android:value="YOUR_GOOGLE_MAPS_API_KEY_HERE"
```

With your actual API key:
```xml
android:value="AIzaSyC..."
```

---

## Troubleshooting

### "Flutter not found"
- Add Flutter to PATH: `C:\src\flutter\bin`
- Restart terminal

### "Android SDK not found"
- Run: `flutter doctor`
- Install via Android Studio

### Build fails
```bash
flutter clean
flutter pub get
flutter build apk --release
```

### Maps not working
- Verify API key in `AndroidManifest.xml`
- Check Google Cloud Console for API restrictions

---

## Next Steps

1. ✅ Install Flutter
2. ✅ Get Google Maps API key
3. ✅ Update `AndroidManifest.xml` with API key
4. ✅ Run `build_apk.bat`
5. ✅ Install APK on device or upload to Play Store

---

**Need help?** See `BUILD_ANDROID.md` for detailed instructions.
