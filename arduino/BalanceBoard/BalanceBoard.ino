/*
 * Balance Board - ESP32-S3 Firmware
 * ================================
 * 
 * Sends sensor data via USB serial at 115200 baud.
 * Data format: "TiltX: 0.02  TiltY: -0.37  Left: 0  Right: 150"
 * 
 * Hardware:
 * - ESP32-S3 DevKit
 * - MPU6050 Accelerometer (I2C: SDA=GPIO8, SCL=GPIO9)
 * - Left Force Sensor: GPIO4
 * - Right Force Sensor: GPIO5
 * 
 * Upload with Arduino CLI:
 *   arduino-cli compile --fqbn esp32:esp32:esp32s3 BalanceBoard.ino
 *   arduino-cli upload -p COM3 --fqbn esp32:esp32:esp32s3 BalanceBoard.ino
 */

#include <Wire.h>

#define MPU_ADDR 0x68
#define LEFT_FSR 4
#define RIGHT_FSR 5

// Timing
const unsigned long SEND_INTERVAL_MS = 50;  // Send data every 50ms (20Hz)
const int FSR_SAMPLE_COUNT = 8;
const adc_attenuation_t FSR_ADC_ATTENUATION = ADC_0db;
unsigned long lastSendTime = 0;

int readForceSensor(int pin) {
  long total = 0;
  for (int i = 0; i < FSR_SAMPLE_COUNT; i += 1) {
    total += analogRead(pin);
    delay(1);
  }
  return total / FSR_SAMPLE_COUNT;
}

void setup() {
  Serial.begin(115200);
  
  // Wait for serial connection (useful for debugging)
  delay(3000);
  
  // Initialize I2C for MPU6050
  // GPIO8 = SDA, GPIO9 = SCL (ESP32-S3 default pins)
  Wire.begin(8, 9);
  
  // Initialize MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // PWR_MGMT_1 register
  Wire.write(0);     // Wake up MPU6050
  Wire.endTransmission(true);
  
  // Configure force sensor pins
  analogReadResolution(12);
  pinMode(LEFT_FSR, INPUT);
  pinMode(RIGHT_FSR, INPUT);
  analogRead(LEFT_FSR);
  analogRead(RIGHT_FSR);
  analogSetPinAttenuation(LEFT_FSR, FSR_ADC_ATTENUATION);
  analogSetPinAttenuation(RIGHT_FSR, FSR_ADC_ATTENUATION);
  analogRead(LEFT_FSR);
  analogRead(RIGHT_FSR);
  
  Serial.println("# Balance Board Started");
  Serial.println("# Format: TiltX TiltY Left Right");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Send data at fixed interval
  if (currentTime - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = currentTime;
    
    // Read accelerometer data
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);  // Starting register for accel data
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_ADDR, 6, true);  // Request 6 bytes
    
    int16_t ax = Wire.read() << 8 | Wire.read();
    int16_t ay = Wire.read() << 8 | Wire.read();
    int16_t az = Wire.read() << 8 | Wire.read();
    
    // Convert to tilt values (-1.0 to 1.0)
    // MPU6050 raw values are +/- 16384 for +/- 1g
    float tiltX = ax / 16384.0;
    float tiltY = ay / 16384.0;
    
    // Read force sensors
    int leftForce = readForceSensor(LEFT_FSR);
    int rightForce = readForceSensor(RIGHT_FSR);
    
    // Send formatted data
    Serial.print("TiltX: ");
    Serial.print(tiltX, 2);
    Serial.print("  TiltY: ");
    Serial.print(tiltY, 2);
    Serial.print("  Left: ");
    Serial.print(leftForce);
    Serial.print("  Right: ");
    Serial.println(rightForce);
  }
}
