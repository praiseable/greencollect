@echo off
echo ========================================
echo  Kabariya - Android APK Builder
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Flutter installation...
flutter --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Flutter is not installed or not in PATH!
    echo Please install Flutter from https://flutter.dev
    pause
    exit /b 1
)

echo [2/4] Cleaning previous build...
flutter clean

echo [3/4] Getting dependencies...
flutter pub get
if errorlevel 1 (
    echo ERROR: Failed to get dependencies!
    pause
    exit /b 1
)

echo [4/4] Building release APK...
flutter build apk --release
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  BUILD SUCCESSFUL!
echo ========================================
echo.
echo APK Location:
echo   build\app\outputs\flutter-apk\app-release.apk
echo.
echo To build split APKs (smaller files):
echo   flutter build apk --release --split-per-abi
echo.
pause
