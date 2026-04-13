# Balance Board Arduino Setup

Complete guide to uploading the ESP32-S3 firmware using **Arduino CLI** (no Arduino IDE needed).

## Quick Start

### 1. Install Arduino CLI

**Windows (PowerShell):**
```powershell
# Download and install
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/arduino/arduino-cli/master/install/install.ps1" -OutFile "$env:TEMP\install-arduino-cli.ps1"
& "$env:TEMP\install-arduino-cli.ps1"

# Add to PATH (if not done automatically)
$env:PATH += ";$env:LOCALAPPDATA\Programs\Arduino CLI"
```

**Or download manually:** [arduino-cli releases](https://github.com/arduino/arduino-cli/releases)

### 2. Configure Arduino CLI

```bash
# Initialize config
arduino-cli config init

# Add ESP32 board support
arduino-cli config add board_manager.additional_urls "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json"

# Update index
arduino-cli core update-index

# Install ESP32 core
arduino-cli core install esp32:esp32
```

### 3. Connect Your ESP32-S3

1. Connect ESP32-S3 to your computer via USB
2. Find the COM port:
   ```powershell
   # Windows
   [System.IO.Ports.SerialPort]::GetPortNames()
   
   # Or in Device Manager → Ports (COM & LPT)
   ```

### 4. Upload the Firmware

**Option A: Use the provided batch script (Windows)**
```powershell
cd arduino
.\upload.ps1
```

**Option B: Manual CLI commands**
```bash
# Navigate to sketch folder
cd arduino/BalanceBoard

# Compile
arduino-cli compile --fqbn esp32:esp32:esp32s3 BalanceBoard.ino

# Upload (replace COM3 with your port)
arduino-cli upload -p COM3 --fqbn esp32:esp32:esp32s3 BalanceBoard.ino

# Monitor serial output
arduino-cli monitor -p COM3 --config baudrate=115200
```

## Files

```
arduino/
├── BalanceBoard/
│   └── BalanceBoard.ino    # Main firmware
├── upload.ps1              # Windows upload script
└── README.md               # This file
```

## Hardware Wiring

| Component | ESP32-S3 Pin |
|-----------|-------------|
| MPU6050 SDA | GPIO 8 |
| MPU6050 SCL | GPIO 9 |
| Left Force Sensor | GPIO 6 |
| Right Force Sensor | GPIO 5 |

## Verify Installation

After uploading, open Serial Monitor:
```bash
arduino-cli monitor -p COM3 --config baudrate=115200
```

You should see output like:
```
# Balance Board Started
# Format: TiltX TiltY Left Right
TiltX: 0.02  TiltY: -0.37  Left: 0  Right: 150
TiltX: 0.01  TiltY: -0.35  Left: 0  Right: 148
```

## Troubleshooting

### "Port not found"
- Check USB cable (must be data cable, not charge-only)
- Install CP210x or CH340 driver if needed
- Try different USB port

### "Permission denied" (Linux/Mac)
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER
# Log out and back in
```

### Wrong board selected
```bash
# List available boards
arduino-cli board list

# Search for ESP32-S3
arduino-cli core search esp32
```

## Web Serial Connection

Once firmware is uploaded, connect from the game:

1. Open the Seasons Wheel game in **Chrome or Edge**
2. Click "🔗 Connect" button (bottom-right corner)
3. Select the ESP32 port from the popup
4. Status changes to 🟢 green when connected
5. Lean left/right to spin the wheel!

## Data Format

```
TiltX: 0.02  TiltY: -0.37  Left: 0  Right: 150
```

| Field | Range | Meaning |
|-------|-------|---------|
| TiltX | -1.0 to 1.0 | Forward/backward tilt (not used) |
| TiltY | -1.0 to 1.0 | **Left/right tilt** (primary control) |
| Left | 0 to ~300 | Left force sensor (not used) |
| Right | 0 to ~300 | Right force sensor (not used) |

## Game Logic

- **Tilt left** (TiltY < -0.18) → Spin wheel left once
- **Tilt right** (TiltY > 0.18) → Spin wheel right once
- Must return to center between tilts
- One tilt = one spin burst (auto-resets after 300ms)
