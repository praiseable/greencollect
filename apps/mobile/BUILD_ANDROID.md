# 📱 Building Android APK for GreenCollect Mobile App

## Prerequisites

1. **Install Flutter SDK**
   - Download from: https://flutter.dev/docs/get-started/install/windows
   - Extract to `C:\src\flutter` (or your preferred location)
   - Add to PATH: `C:\src\flutter\bin`
   - Verify: `flutter doctor`

2. **Install Android Studio**
   - Download from: https://developer.android.com/studio
   - Install Android SDK (API 33+ recommended)
   - Accept Android licenses: `flutter doctor --android-licenses`

3. **Install Java JDK**
   - JDK 17 or higher required
   - Download from: https://adoptium.net/
   - Set `JAVA_HOME` environment variable

---

## Setup Steps

### 1. Initialize Flutter Project (if Android folder missing)

```bash
cd D:\gc-app\apps\mobile
flutter create --platforms=android .
```

### 2. Configure Android Build

Edit `android/app/build.gradle`:
- Set `minSdkVersion` to 21
- Set `targetSdkVersion` to 33
- Configure signing (see below)

### 3. Get Dependencies

```bash
flutter pub get
```

### 4. Build APK

**Debug APK:**
```bash
flutter build apk --debug
```

**Release APK:**
```bash
flutter build apk --release
```

**Release APK (Split by ABI - smaller files):**
```bash
flutter build apk --release --split-per-abi
```

### 5. Find APK

- Debug: `build/app/outputs/flutter-apk/app-debug.apk`
- Release: `build/app/outputs/flutter-apk/app-release.apk`
- Split: `build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk` (and others)

---

## Android Configuration Files

The following files need to be created/configured:

1. `android/app/build.gradle` - Build configuration
2. `android/build.gradle` - Project-level build config
3. `android/app/src/main/AndroidManifest.xml` - App manifest
4. `android/gradle.properties` - Gradle properties
5. `android/local.properties` - Local SDK paths (auto-generated)

---

## Google Maps API Key

The app uses Google Maps. You need to:

1. Get API key from: https://console.cloud.google.com/
2. Enable "Maps SDK for Android"
3. Add key to `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_API_KEY_HERE"/>
```

---

## Signing APK (Release)

For release builds, configure signing in `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

Create `android/key.properties`:
```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=greencollect
storeFile=../greencollect.jks
```

Generate keystore:
```bash
keytool -genkey -v -keystore greencollect.jks -keyalg RSA -keysize 2048 -validity 10000 -alias greencollect
```

---

## Troubleshooting

### Flutter not found
- Add Flutter to PATH: `C:\src\flutter\bin`
- Restart terminal/IDE

### Android SDK not found
- Run: `flutter doctor`
- Install missing components via Android Studio

### Build fails
- Clean build: `flutter clean`
- Get dependencies: `flutter pub get`
- Rebuild: `flutter build apk --release`

### Google Maps not working
- Verify API key in `AndroidManifest.xml`
- Check API key restrictions in Google Cloud Console
- Enable required APIs

---

## Quick Build Script

Create `build_apk.bat`:

```batch
@echo off
cd /d D:\gc-app\apps\mobile
flutter clean
flutter pub get
flutter build apk --release
echo.
echo APK built at: build\app\outputs\flutter-apk\app-release.apk
pause
```

---

**Last Updated**: March 2026
