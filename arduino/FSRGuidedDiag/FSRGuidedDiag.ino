/*
 * FSR Guided Diagnostic - ESP32-S3
 * ================================
 *
 * Wiring expected:
 * - FSR leg 1 -> 3.3V
 * - FSR leg 2 -> GPIO4/GPIO5
 * - 10k resistor from GPIO4/GPIO5 node -> GND
 *
 * This sketch records baseline, FSR1 press, and FSR2 press windows.
 * It reads GPIO4 and GPIO5 with multiple ADC attenuation settings so we
 * can tell whether the divider voltage is present but very small.
 */

#define FSR_1_PIN 4
#define FSR_2_PIN 5

const int ADC_MAX = 4095;
const int SAMPLE_DELAY_MS = 20;
const int WINDOW_SECONDS = 8;

struct ReadingStats {
  int min1;
  int max1;
  long total1;
  int min2;
  int max2;
  long total2;
  int count;
};

void resetStats(ReadingStats &stats) {
  stats.min1 = ADC_MAX;
  stats.max1 = 0;
  stats.total1 = 0;
  stats.min2 = ADC_MAX;
  stats.max2 = 0;
  stats.total2 = 0;
  stats.count = 0;
}

void addSample(ReadingStats &stats, int v1, int v2) {
  if (v1 < stats.min1) stats.min1 = v1;
  if (v1 > stats.max1) stats.max1 = v1;
  stats.total1 += v1;

  if (v2 < stats.min2) stats.min2 = v2;
  if (v2 > stats.max2) stats.max2 = v2;
  stats.total2 += v2;

  stats.count += 1;
}

void applyAttenuation(adc_attenuation_t attenuation) {
  analogRead(FSR_1_PIN);
  analogRead(FSR_2_PIN);
  analogSetPinAttenuation(FSR_1_PIN, attenuation);
  analogSetPinAttenuation(FSR_2_PIN, attenuation);
  delay(50);
}

void runWindow(const char *label, adc_attenuation_t attenuation) {
  ReadingStats stats;
  resetStats(stats);
  applyAttenuation(attenuation);

  unsigned long start = millis();
  unsigned long lastPrint = 0;

  while (millis() - start < WINDOW_SECONDS * 1000UL) {
    int v1 = analogRead(FSR_1_PIN);
    int v2 = analogRead(FSR_2_PIN);
    addSample(stats, v1, v2);

    if (millis() - lastPrint >= 1000) {
      lastPrint = millis();
      Serial.print(label);
      Serial.print(" live fsr1=");
      Serial.print(v1);
      Serial.print(" fsr2=");
      Serial.println(v2);
    }

    delay(SAMPLE_DELAY_MS);
  }

  Serial.print(label);
  Serial.print(" RESULT fsr1[min/avg/max]=");
  Serial.print(stats.min1);
  Serial.print("/");
  Serial.print(stats.count ? stats.total1 / stats.count : 0);
  Serial.print("/");
  Serial.print(stats.max1);
  Serial.print(" fsr2[min/avg/max]=");
  Serial.print(stats.min2);
  Serial.print("/");
  Serial.print(stats.count ? stats.total2 / stats.count : 0);
  Serial.print("/");
  Serial.println(stats.max2);
}

void runDigitalPullTest() {
  Serial.println("DIGITAL/PULL TEST start");

  pinMode(FSR_1_PIN, INPUT);
  pinMode(FSR_2_PIN, INPUT);
  delay(100);
  Serial.print("INPUT digital fsr1=");
  Serial.print(digitalRead(FSR_1_PIN));
  Serial.print(" fsr2=");
  Serial.println(digitalRead(FSR_2_PIN));

  pinMode(FSR_1_PIN, INPUT_PULLUP);
  pinMode(FSR_2_PIN, INPUT_PULLUP);
  delay(200);
  Serial.print("INPUT_PULLUP digital fsr1=");
  Serial.print(digitalRead(FSR_1_PIN));
  Serial.print(" fsr2=");
  Serial.println(digitalRead(FSR_2_PIN));

  pinMode(FSR_1_PIN, INPUT_PULLDOWN);
  pinMode(FSR_2_PIN, INPUT_PULLDOWN);
  delay(200);
  Serial.print("INPUT_PULLDOWN digital fsr1=");
  Serial.print(digitalRead(FSR_1_PIN));
  Serial.print(" fsr2=");
  Serial.println(digitalRead(FSR_2_PIN));

  pinMode(FSR_1_PIN, INPUT);
  pinMode(FSR_2_PIN, INPUT);
  Serial.println("DIGITAL/PULL TEST end");
}

void countdown(const char *message) {
  Serial.println();
  Serial.println(message);
  for (int i = 3; i >= 1; i -= 1) {
    Serial.print("Starting in ");
    Serial.println(i);
    delay(1000);
  }
}

void runAllWindowsForMode(const char *modeLabel, adc_attenuation_t attenuation) {
  Serial.println();
  Serial.print("=== ADC MODE ");
  Serial.print(modeLabel);
  Serial.println(" ===");

  countdown("Do NOT press either FSR for baseline.");
  runWindow("baseline", attenuation);

  countdown("PRESS AND HOLD FSR 1 now.");
  runWindow("fsr1_press", attenuation);

  countdown("PRESS AND HOLD FSR 2 now.");
  runWindow("fsr2_press", attenuation);
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  analogReadResolution(12);
  pinMode(FSR_1_PIN, INPUT);
  pinMode(FSR_2_PIN, INPUT);
  analogRead(FSR_1_PIN);
  analogRead(FSR_2_PIN);

  Serial.println("# FSR Guided Diagnostic Started");
  Serial.println("# GPIO4 = FSR1, GPIO5 = FSR2, baud 115200");
  Serial.println("# Follow the prompts and press firmly during each press window.");
  Serial.println("# Send any character over Serial to start.");
  while (!Serial.available()) {
    delay(20);
  }
  while (Serial.available()) {
    Serial.read();
  }
  Serial.println("# Start command received.");

  runDigitalPullTest();
  runAllWindowsForMode("ADC_0db", ADC_0db);
  runAllWindowsForMode("ADC_11db", ADC_11db);

  Serial.println();
  Serial.println("# Diagnostic complete. Reset board to run again.");
}

void loop() {
  delay(1000);
}
