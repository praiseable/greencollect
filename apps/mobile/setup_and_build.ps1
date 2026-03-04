# GreenCollect Mobile App - Setup and Build Script
# This script checks Flutter installation, device connectivity, and builds/installs the app

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GreenCollect - Android App Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Step 1: Check Flutter Installation
Write-Host "[1/5] Checking Flutter installation..." -ForegroundColor Yellow

$flutterPath = $null
$commonPaths = @(
    "C:\src\flutter\bin\flutter.bat",
    "$env:LOCALAPPDATA\flutter\bin\flutter.bat",
    "$env:USERPROFILE\flutter\bin\flutter.bat"
)

foreach ($path in $commonPaths) {
    if (Test-Path $path) {
        $flutterPath = Split-Path (Split-Path $path -Parent) -Parent
        Write-Host "  ✓ Flutter found at: $flutterPath" -ForegroundColor Green
        break
    }
}

# Check PATH
if (-not $flutterPath) {
    $pathEntries = $env:PATH -split ';'
    foreach ($entry in $pathEntries) {
        if ($entry -like '*flutter*' -and (Test-Path "$entry\flutter.bat")) {
            $flutterPath = $entry
            Write-Host "  ✓ Flutter found in PATH: $flutterPath" -ForegroundColor Green
            break
        }
    }
}

if (-not $flutterPath) {
    Write-Host "  ✗ Flutter not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Flutter:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://flutter.dev/docs/get-started/install/windows" -ForegroundColor White
    Write-Host "  2. Extract to: C:\src\flutter" -ForegroundColor White
    Write-Host "  3. Add to PATH: C:\src\flutter\bin" -ForegroundColor White
    Write-Host "  4. Restart this script" -ForegroundColor White
    Write-Host ""
    $install = Read-Host "Would you like to open the Flutter download page? (Y/N)"
    if ($install -eq "Y" -or $install -eq "y") {
        Start-Process "https://flutter.dev/docs/get-started/install/windows"
    }
    exit 1
}

# Add Flutter to PATH for this session
$env:PATH = "$flutterPath\bin;$env:PATH"

# Verify Flutter works
try {
    $flutterVersion = & flutter --version 2>&1 | Select-Object -First 1
    Write-Host "  ✓ Flutter version: $flutterVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Flutter command failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check Flutter Doctor
Write-Host "[2/5] Running Flutter Doctor..." -ForegroundColor Yellow
& flutter doctor
Write-Host ""

# Step 3: Check for Connected Devices
Write-Host "[3/5] Checking for connected devices..." -ForegroundColor Yellow

# Find ADB
$adbPath = $null
if (Get-Command adb -ErrorAction SilentlyContinue) {
    $adbPath = "adb"
} elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") {
    $adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    $env:PATH = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:PATH"
}

if ($adbPath) {
    Write-Host "  ✓ ADB found" -ForegroundColor Green
    
    # Start ADB server
    & $adbPath start-server 2>&1 | Out-Null
    
    # Get devices
    $devices = & $adbPath devices
    $deviceList = $devices | Where-Object { $_ -match "device$" -and $_ -notmatch "List of devices" }
    
    if ($deviceList.Count -gt 0) {
        Write-Host "  ✓ Connected devices:" -ForegroundColor Green
        $deviceList | ForEach-Object { Write-Host "    - $_" -ForegroundColor White }
        $deviceConnected = $true
    } else {
        Write-Host "  ⚠ No devices connected" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To connect a device:" -ForegroundColor Yellow
        Write-Host "  1. Enable Developer Options on your Android phone" -ForegroundColor White
        Write-Host "  2. Enable USB Debugging" -ForegroundColor White
        Write-Host "  3. Connect phone via USB" -ForegroundColor White
        Write-Host "  4. Accept USB debugging prompt on phone" -ForegroundColor White
        Write-Host ""
        Write-Host "Or start an Android emulator:" -ForegroundColor Yellow
        Write-Host "  1. Open Android Studio" -ForegroundColor White
        Write-Host "  2. Tools > Device Manager" -ForegroundColor White
        Write-Host "  3. Start an emulator" -ForegroundColor White
        Write-Host ""
        $deviceConnected = $false
    }
} else {
    Write-Host "  ⚠ ADB not found (Android SDK not installed)" -ForegroundColor Yellow
    $deviceConnected = $false
}

Write-Host ""

# Step 4: Check Google Maps API Key
Write-Host "[4/5] Checking Google Maps API Key..." -ForegroundColor Yellow
$manifestPath = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifestPath) {
    $manifestContent = Get-Content $manifestPath -Raw
    if ($manifestContent -match 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        Write-Host "  ⚠ Google Maps API Key not configured!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please update: android\app\src\main\AndroidManifest.xml" -ForegroundColor White
        Write-Host "Replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' with your API key" -ForegroundColor White
        Write-Host ""
        $continue = Read-Host "Continue anyway? (Maps won't work) (Y/N)"
        if ($continue -ne "Y" -and $continue -ne "y") {
            exit 1
        }
    } else {
        Write-Host "  ✓ Google Maps API Key configured" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ AndroidManifest.xml not found" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Build and Install
Write-Host "[5/5] Building and installing app..." -ForegroundColor Yellow
Write-Host ""

if (-not $deviceConnected) {
    Write-Host "⚠ No device connected. Building APK only..." -ForegroundColor Yellow
    Write-Host ""
    
    & flutter clean
    & flutter pub get
    & flutter build apk --release
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "APK Location:" -ForegroundColor Cyan
        Write-Host "  build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor White
        Write-Host ""
        Write-Host "To install on device:" -ForegroundColor Yellow
        Write-Host "  1. Connect your Android device" -ForegroundColor White
        Write-Host "  2. Enable USB Debugging" -ForegroundColor White
        Write-Host "  3. Run: adb install build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  BUILD FAILED!" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Building and installing on connected device..." -ForegroundColor Cyan
    Write-Host ""
    
    & flutter clean
    & flutter pub get
    & flutter install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  INSTALLATION SUCCESSFUL!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "App installed on device!" -ForegroundColor Cyan
        Write-Host "You can now test the app." -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  INSTALLATION FAILED!" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Trying to build APK instead..." -ForegroundColor Yellow
        & flutter build apk --release
    }
}

Write-Host ""
