# 🚀 Install Android App - Quick Start

## Current Status Check

Run this to check your system:
```powershell
cd D:\gc-app\apps\mobile
.\check_devices.ps1
```

---

## What You Need

1. ✅ **Flutter SDK** - [Download Here](https://flutter.dev/docs/get-started/install/windows)
2. ✅ **Android Device** (connected via USB) OR **Android Emulator**
3. ✅ **Google Maps API Key** - [Get Here](https://console.cloud.google.com/)

---

## Quick Install Steps

### 1. Install Flutter (5 minutes)

1. Download: https://flutter.dev/docs/get-started/install/windows
2. Extract to: `C:\src\flutter`
3. Add to PATH: `C:\src\flutter\bin`
4. Restart terminal
5. Verify: `flutter doctor`

### 2. Connect Device (2 minutes)

**Physical Device:**
- Enable Developer Options (tap Build Number 7 times)
- Enable USB Debugging
- Connect via USB
- Accept USB debugging prompt

**OR Emulator:**
- Open Android Studio
- Tools > Device Manager
- Start an emulator

### 3. Add Google Maps API Key (2 minutes)

1. Get key from: https://console.cloud.google.com/
2. Edit: `android/app/src/main/AndroidManifest.xml`
3. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your key

### 4. Build & Install (5 minutes)

```powershell
cd D:\gc-app\apps\mobile
.\setup_and_build.ps1
```

**That's it!** The app will be installed on your device.

---

## If Something Goes Wrong

### Flutter not found?
- Check PATH: `echo $env:PATH`
- Restart terminal after adding Flutter to PATH

### No device found?
- Run: `.\check_devices.ps1`
- Check USB connection
- Verify USB Debugging enabled

### Build fails?
- Run: `flutter clean`
- Run: `flutter pub get`
- Check: `flutter doctor`

---

## Manual Build (Alternative)

If the script doesn't work:

```powershell
cd D:\gc-app\apps\mobile
flutter clean
flutter pub get
flutter install
```

---

**Ready?** Start with Step 1 above! 🎯
