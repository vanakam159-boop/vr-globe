/*
 * FSR Sensor Test - ESP32-S3
 * ==========================
 *
 * Wiring:
 * - FSR 1: one leg to 3.3V, other leg to GPIO4
 * - 10k resistor from GPIO4 to GND
 * - FSR 2: one leg to 3.3V, other leg to GPIO5
 * - 10k resistor from GPIO5 to GND
 *
 * Sends one JSON line every 500ms at 115200 baud.
 */

#define FSR_1_PIN 4
#define FSR_2_PIN 5

const unsigned long SAMPLE_INTERVAL_MS = 500;
const int ADC_MAX = 4095;
const int PRESS_THRESHOLD = 12;
const int ADC_SAMPLE_COUNT = 20;
const adc_attenuation_t FSR_ADC_ATTENUATION = ADC_0db;

unsigned long lastSampleAt = 0;

int readAverage(int pin) {
  long total = 0;
  for (int i = 0; i < ADC_SAMPLE_COUNT; i += 1) {
    total += analogRead(pin);
    delay(2);
  }
  return total / ADC_SAMPLE_COUNT;
}

float toPercent(int raw) {
  return (raw * 100.0) / ADC_MAX;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);
  pinMode(FSR_1_PIN, INPUT);
  pinMode(FSR_2_PIN, INPUT);
  analogRead(FSR_1_PIN);
  analogRead(FSR_2_PIN);
  analogSetPinAttenuation(FSR_1_PIN, FSR_ADC_ATTENUATION);
  analogSetPinAttenuation(FSR_2_PIN, FSR_ADC_ATTENUATION);
  analogRead(FSR_1_PIN);
  analogRead(FSR_2_PIN);

  Serial.println("# FSR Sensor Test Started");
  Serial.println("# Format: JSON every 500ms");
  Serial.println("# Pins: FSR1=GPIO4/A3 FSR2=GPIO5/A4");
  Serial.println("# ADC: high-sensitivity ADC_0db, press threshold raw=12");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
  lastSampleAt = now;

  int fsr1Raw = readAverage(FSR_1_PIN);
  int fsr2Raw = readAverage(FSR_2_PIN);
  int fsr1Mv = analogReadMilliVolts(FSR_1_PIN);
  int fsr2Mv = analogReadMilliVolts(FSR_2_PIN);

  Serial.print("{\"fsr1\":");
  Serial.print(fsr1Raw);
  Serial.print(",\"fsr2\":");
  Serial.print(fsr2Raw);
  Serial.print(",\"fsr1Pct\":");
  Serial.print(toPercent(fsr1Raw), 1);
  Serial.print(",\"fsr2Pct\":");
  Serial.print(toPercent(fsr2Raw), 1);
  Serial.print(",\"fsr1Mv\":");
  Serial.print(fsr1Mv);
  Serial.print(",\"fsr2Mv\":");
  Serial.print(fsr2Mv);
  Serial.print(",\"fsr1Pressed\":");
  Serial.print(fsr1Raw > PRESS_THRESHOLD ? "true" : "false");
  Serial.print(",\"fsr2Pressed\":");
  Serial.print(fsr2Raw > PRESS_THRESHOLD ? "true" : "false");
  Serial.println("}");
}
