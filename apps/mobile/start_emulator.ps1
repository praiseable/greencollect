# Start Android Emulator Script

Write-Host "Checking for Android emulators..." -ForegroundColor Cyan
Write-Host ""

# Find emulator
$emulatorPath = $null
if (Test-Path "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe") {
    $emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"
} elseif (Test-Path "$env:ANDROID_HOME\emulator\emulator.exe") {
    $emulatorPath = "$env:ANDROID_HOME\emulator\emulator.exe"
}

if (-not $emulatorPath) {
    Write-Host "Emulator not found!" -ForegroundColor Red
    Write-Host "Install Android Studio and create an emulator" -ForegroundColor Yellow
    exit 1
}

# List available AVDs
Write-Host "Available emulators:" -ForegroundColor Yellow
$avds = & $emulatorPath -list-avds
$avdList = @()
$index = 1
foreach ($avd in $avds) {
    Write-Host "  $index. $avd" -ForegroundColor White
    $avdList += $avd
    $index++
}

if ($avdList.Count -eq 0) {
    Write-Host "  No emulators found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Create an emulator:" -ForegroundColor Yellow
    Write-Host "  1. Open Android Studio" -ForegroundColor White
    Write-Host "  2. Tools > Device Manager" -ForegroundColor White
    Write-Host "  3. Create Device" -ForegroundColor White
    exit 1
}

Write-Host ""
$selected = Read-Host "Select emulator to start (1-$($avdList.Count))"

if ($selected -match '^\d+$' -and [int]$selected -ge 1 -and [int]$selected -le $avdList.Count) {
    $selectedAvd = $avdList[[int]$selected - 1]
    Write-Host ""
    Write-Host "Starting: $selectedAvd" -ForegroundColor Green
    Write-Host "This may take a minute..." -ForegroundColor Yellow
    Write-Host ""
    
    # Start emulator in background
    Start-Process $emulatorPath -ArgumentList "-avd", $selectedAvd -WindowStyle Minimized
    
    Write-Host "Emulator is starting..." -ForegroundColor Cyan
    Write-Host "Wait for it to fully boot, then run: .\check_devices.ps1" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Invalid selection!" -ForegroundColor Red
    exit 1
}
