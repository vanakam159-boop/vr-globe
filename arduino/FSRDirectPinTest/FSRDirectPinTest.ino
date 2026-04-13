/*
 * FSR Direct Pin Test - ESP32-S3
 * ==============================
 *
 * Reads GPIO4 and GPIO5 quickly. For diagnosis:
 * - Touch GPIO4 to 3.3V: fsr1 should jump high.
 * - Touch GPIO5 to 3.3V: fsr2 should jump high.
 */

#define FSR_1_PIN 4
#define FSR_2_PIN 5

const unsigned long SAMPLE_INTERVAL_MS = 100;

unsigned long lastSampleAt = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  analogReadResolution(12);

  pinMode(FSR_1_PIN, INPUT);
  pinMode(FSR_2_PIN, INPUT);
  analogRead(FSR_1_PIN);
  analogRead(FSR_2_PIN);
  analogSetPinAttenuation(FSR_1_PIN, ADC_11db);
  analogSetPinAttenuation(FSR_2_PIN, ADC_11db);

  Serial.println("# Direct GPIO4/GPIO5 ADC test");
  Serial.println("# Touch GPIO4 to 3.3V, then GPIO5 to 3.3V.");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
  lastSampleAt = now;

  int fsr1 = analogRead(FSR_1_PIN);
  int fsr2 = analogRead(FSR_2_PIN);

  Serial.print("fsr1=");
  Serial.print(fsr1);
  Serial.print(" fsr2=");
  Serial.println(fsr2);
}
