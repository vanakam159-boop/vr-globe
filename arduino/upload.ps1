# Balance Board Upload Script for Windows
# ========================================
# Automatically compiles and uploads the ESP32-S3 firmware
# 
# Usage:
#   .\upload.ps1              # Auto-detects port
#   .\upload.ps1 -Port COM3   # Use specific port
#   .\upload.ps1 -Monitor     # Open serial monitor after upload

param(
    [string]$Port = "",
    [switch]$Monitor
)

$ErrorActionPreference = "Stop"

Write-Host @"
╔══════════════════════════════════════════════════════════╗
║         🎯 Balance Board Firmware Uploader               ║
║              ESP32-S3 via Arduino CLI                    ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Check if arduino-cli is installed
$arduinoCli = Get-Command arduino-cli -ErrorAction SilentlyContinue
if (-not $arduinoCli) {
    Write-Host "❌ arduino-cli not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it first:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://github.com/arduino/arduino-cli/releases"
    Write-Host "  2. Add to PATH, or run:"
    Write-Host "     `$env:PATH += `";`$env:LOCALAPPDATA\Programs\Arduino CLI`""
    Write-Host ""
    exit 1
}

Write-Host "✓ Arduino CLI found: $($arduinoCli.Source)" -ForegroundColor Green

# Check ESP32 core
Write-Host ""
Write-Host "Checking ESP32 core..." -ForegroundColor Yellow
$coreList = arduino-cli core list 2>$null
if ($coreList -notmatch "esp32:esp32") {
    Write-Host "⚠ ESP32 core not installed. Installing now..." -ForegroundColor Yellow
    
    # Add board manager URL
    arduino-cli config init 2>$null
    arduino-cli config add board_manager.additional_urls "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json"
    arduino-cli core update-index
    
    # Install ESP32 core
    arduino-cli core install esp32:esp32
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install ESP32 core" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ ESP32 core ready" -ForegroundColor Green

# Find port if not specified
if (-not $Port) {
    Write-Host ""
    Write-Host "Detecting ESP32 port..." -ForegroundColor Yellow
    
    # Try to detect from board list
    $boardList = arduino-cli board list --format json | ConvertFrom-Json
    $esp32Board = $boardList | Where-Object { $_.boards -and $_.boards.name -match "ESP32" }
    
    if ($esp32Board) {
        $Port = $esp32Board.port.address
        Write-Host "✓ Found ESP32 on $Port" -ForegroundColor Green
    } else {
        # Fallback: list COM ports
        $ports = [System.IO.Ports.SerialPort]::GetPortNames()
        if ($ports.Count -eq 1) {
            $Port = $ports[0]
            Write-Host "✓ Using only available port: $Port" -ForegroundColor Green
        } elseif ($ports.Count -gt 1) {
            Write-Host "Multiple ports found:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $ports.Count; $i++) {
                Write-Host "  [$i] $($ports[$i])"
            }
            $selection = Read-Host "Select port number (0-$($ports.Count-1))"
            $Port = $ports[$selection]
        } else {
            Write-Host "❌ No serial ports found!" -ForegroundColor Red
            Write-Host "   - Check USB cable (must be data cable)" -ForegroundColor Yellow
            Write-Host "   - Install CP210x/CH340 driver if needed" -ForegroundColor Yellow
            exit 1
        }
    }
}

Write-Host ""
Write-Host "Target: $Port" -ForegroundColor Cyan

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sketchPath = Join-Path $scriptDir "BalanceBoard" "BalanceBoard.ino"

if (-not (Test-Path $sketchPath)) {
    Write-Host "❌ Sketch not found: $sketchPath" -ForegroundColor Red
    exit 1
}

Write-Host "Sketch: $sketchPath" -ForegroundColor Gray

# Compile
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "Compiling..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkGray

arduino-cli compile --fqbn esp32:esp32:esp32s3 "$sketchPath"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Compilation failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Compilation successful!" -ForegroundColor Green

# Upload
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "Uploading to $Port..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkGray

arduino-cli upload -p $Port --fqbn esp32:esp32:esp32s3 "$sketchPath"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    Write-Host "   Try holding BOOT button on ESP32 during upload" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host @"
╔══════════════════════════════════════════════════════════╗
║              ✅ Upload Complete!                          ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

# Open monitor if requested
if ($Monitor) {
    Write-Host ""
    Write-Host "Opening serial monitor (115200 baud)..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to exit" -ForegroundColor DarkGray
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    arduino-cli monitor -p $Port --config baudrate=115200
} else {
    Write-Host ""
    Write-Host "To monitor serial output, run:" -ForegroundColor Cyan
    Write-Host "  arduino-cli monitor -p $Port --config baudrate=115200" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or re-run this script with -Monitor flag:" -ForegroundColor Cyan
    Write-Host "  .\upload.ps1 -Port $Port -Monitor" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎮 Ready to play! Open the game in Chrome/Edge and click 'Connect'" -ForegroundColor Magenta
