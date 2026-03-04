# Quick Device Check Script
# Checks for connected Android devices or emulators

Write-Host "Checking for Android devices..." -ForegroundColor Cyan
Write-Host ""

# Find ADB
$adbPath = $null
if (Get-Command adb -ErrorAction SilentlyContinue) {
    $adbPath = "adb"
} elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") {
    $adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    $env:PATH = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:PATH"
}

if (-not $adbPath) {
    Write-Host "ADB not found!" -ForegroundColor Red
    Write-Host "  Install Android Studio to get ADB" -ForegroundColor Yellow
    exit 1
}

# Start ADB server
& $adbPath start-server 2>&1 | Out-Null

# Get devices
Write-Host "Connected devices:" -ForegroundColor Yellow
$devices = & $adbPath devices
$deviceList = $devices | Where-Object { $_ -match "device$" -and $_ -notmatch "List of devices" }

if ($deviceList.Count -eq 0) {
    Write-Host "  No devices connected" -ForegroundColor Red
    Write-Host ""
    Write-Host "To connect a physical device:" -ForegroundColor Yellow
    Write-Host "  1. Enable Developer Options:" -ForegroundColor White
    Write-Host "     - Go to Settings > About Phone" -ForegroundColor Gray
    Write-Host "     - Tap Build Number 7 times" -ForegroundColor Gray
    Write-Host "  2. Enable USB Debugging:" -ForegroundColor White
    Write-Host "     - Go to Settings > Developer Options" -ForegroundColor Gray
    Write-Host "     - Enable USB Debugging" -ForegroundColor Gray
    Write-Host "  3. Connect via USB" -ForegroundColor White
    Write-Host "  4. Accept USB debugging prompt on phone" -ForegroundColor White
    Write-Host ""
    Write-Host "To start an emulator:" -ForegroundColor Yellow
    Write-Host "  1. Open Android Studio" -ForegroundColor White
    Write-Host "  2. Tools > Device Manager" -ForegroundColor White
    Write-Host "  3. Click Play button on an emulator" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Cyan
} else {
    Write-Host "  Found device(s):" -ForegroundColor Green
    $deviceList | ForEach-Object {
        $deviceId = ($_ -split '\s+')[0]
        $deviceModel = & $adbPath -s $deviceId shell getprop ro.product.model 2>&1
        $deviceVersion = & $adbPath -s $deviceId shell getprop ro.build.version.release 2>&1
        Write-Host "    - $deviceId" -ForegroundColor White
        Write-Host "      Model: $deviceModel" -ForegroundColor Gray
        Write-Host "      Android: $deviceVersion" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Ready to build and install!" -ForegroundColor Green
    Write-Host "Run: setup_and_build.ps1" -ForegroundColor Cyan
}

Write-Host ""
