# 📱 Complete Setup Guide - Build & Install Android App

## Current System Status

✅ **ADB Available** - Android Debug Bridge is installed  
❌ **Flutter Not Found** - Flutter SDK needs to be installed  
❌ **No Device Connected** - No Android device or emulator detected

---

## Step 1: Install Flutter SDK

### Option A: Automatic Download (Recommended)

1. **Download Flutter:**
   - Go to: https://flutter.dev/docs/get-started/install/windows
   - Download the latest stable release ZIP file
   - Extract to: `C:\src\flutter` (or your preferred location)

2. **Add to PATH:**
   - Open System Properties > Environment Variables
   - Edit "Path" under User variables
   - Add: `C:\src\flutter\bin`
   - Click OK to save

3. **Verify Installation:**
   ```powershell
   flutter --version
   flutter doctor
   ```

### Option B: Using Chocolatey (if installed)

```powershell
choco install flutter
```

---

## Step 2: Connect Android Device OR Start Emulator

### Option A: Connect Physical Android Device

1. **Enable Developer Options:**
   - Go to Settings > About Phone
   - Find "Build Number"
   - Tap it 7 times until you see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to Settings > Developer Options
   - Enable "USB Debugging"
   - Enable "Install via USB" (if available)

3. **Connect Device:**
   - Connect your Android phone to PC via USB
   - On your phone, accept the "Allow USB Debugging" prompt
   - Check the "Always allow from this computer" box

4. **Verify Connection:**
   ```powershell
   cd D:\gc-app\apps\mobile
   .\check_devices.ps1
   ```

### Option B: Start Android Emulator

1. **Open Android Studio:**
   - Launch Android Studio
   - Go to: Tools > Device Manager

2. **Create/Start Emulator:**
   - Click "Create Device" (if no emulator exists)
   - Select a device (e.g., Pixel 5)
   - Download a system image (API 33+ recommended)
   - Click "Finish"
   - Click the Play button to start the emulator

3. **Verify Emulator:**
   ```powershell
   cd D:\gc-app\apps\mobile
   .\check_devices.ps1
   ```

---

## Step 3: Configure Google Maps API Key

**IMPORTANT:** The app uses Google Maps. You need an API key.

1. **Get API Key:**
   - Go to: https://console.cloud.google.com/
   - Create a project (or select existing)
   - Enable "Maps SDK for Android"
   - Create credentials > API Key
   - Copy the API key

2. **Add to App:**
   - Edit: `android/app/src/main/AndroidManifest.xml`
   - Find line 44: `android:value="YOUR_GOOGLE_MAPS_API_KEY_HERE"`
   - Replace with your actual API key

---

## Step 4: Build and Install

### Quick Method (Automated Script)

```powershell
cd D:\gc-app\apps\mobile
.\setup_and_build.ps1
```

This script will:
- ✅ Check Flutter installation
- ✅ Check device connectivity
- ✅ Check Google Maps API key
- ✅ Build the app
- ✅ Install on connected device

### Manual Method

```powershell
cd D:\gc-app\apps\mobile

# Clean previous builds
flutter clean

# Get dependencies
flutter pub get

# Build and install on connected device
flutter install

# OR build APK only
flutter build apk --release
```

---

## Step 5: Test the App

Once installed, test these features from `cursor_prompt.md`:

### ✅ Core Features to Test:

1. **Authentication:**
   - Register with Pakistani phone number (+92 format)
   - OTP verification
   - Login/Logout

2. **Listings:**
   - Browse listings (with geo-fencing)
   - View listing details
   - Create new listing
   - Pick location on map

3. **Maps:**
   - Map view of listings
   - Location picker
   - Get directions

4. **Profile:**
   - View profile
   - Edit profile
   - View my listings

5. **Notifications:**
   - Real-time notifications
   - Notification list

---

## Troubleshooting

### Flutter Not Found
- Ensure Flutter is in PATH
- Restart terminal/IDE after adding to PATH
- Run: `flutter doctor` to check setup

### No Devices Found
- Check USB connection
- Verify USB Debugging is enabled
- Try different USB cable/port
- Restart ADB: `adb kill-server && adb start-server`

### Build Fails
- Run: `flutter clean`
- Run: `flutter pub get`
- Check: `flutter doctor` for missing components
- Ensure Google Maps API key is configured

### Maps Not Working
- Verify API key in `AndroidManifest.xml`
- Check Google Cloud Console for API restrictions
- Ensure "Maps SDK for Android" is enabled

### Installation Fails
- Check device storage space
- Uninstall previous version if exists
- Enable "Install from Unknown Sources" (if needed)

---

## Quick Commands Reference

```powershell
# Check devices
.\check_devices.ps1

# Build and install
.\setup_and_build.ps1

# Manual build
flutter build apk --release

# Install APK manually
adb install build\app\outputs\flutter-apk\app-release.apk

# View logs
flutter logs

# Run in debug mode
flutter run
```

---

## Next Steps After Installation

1. ✅ Test all features
2. ✅ Verify geo-fencing works
3. ✅ Test maps functionality
4. ✅ Check notifications
5. ✅ Test listing creation with location
6. ✅ Verify Urdu language support (if implemented)

---

**Need Help?** Check the detailed guides:
- `BUILD_ANDROID.md` - Detailed build instructions
- `QUICK_BUILD.md` - Quick reference
- `README_BUILD.md` - Overview
