/*
 * FSR Pin Mode Diagnostic - ESP32-S3
 * ==================================
 *
 * Tests GPIO4 and GPIO5 with normal input, internal pull-up, and internal
 * pull-down. This helps distinguish "no pressure" from "pin stuck at GND".
 */

#define FSR_1_PIN 4
#define FSR_2_PIN 5

const int SAMPLE_COUNT = 8;
const unsigned long SAMPLE_INTERVAL_MS = 1000;
unsigned long lastSampleAt = 0;

int readAverage(int pin) {
  long total = 0;
  for (int i = 0; i < SAMPLE_COUNT; i += 1) {
    total += analogRead(pin);
    delay(2);
  }
  return total / SAMPLE_COUNT;
}

int readPinWithMode(int pin, int mode) {
  pinMode(pin, mode);
  delay(25);
  analogRead(pin);
  analogSetPinAttenuation(pin, ADC_11db);
  delay(25);
  return readAverage(pin);
}

void printPinDiag(const char *label, int pin) {
  int normal = readPinWithMode(pin, INPUT);
  int digitalNormal = digitalRead(pin);

  int pullup = readPinWithMode(pin, INPUT_PULLUP);
  int digitalPullup = digitalRead(pin);

  int pulldown = readPinWithMode(pin, INPUT_PULLDOWN);
  int digitalPulldown = digitalRead(pin);

  Serial.print(label);
  Serial.print(" GPIO");
  Serial.print(pin);
  Serial.print(" normal=");
  Serial.print(normal);
  Serial.print(" d=");
  Serial.print(digitalNormal);
  Serial.print(" pullup=");
  Serial.print(pullup);
  Serial.print(" d=");
  Serial.print(digitalPullup);
  Serial.print(" pulldown=");
  Serial.print(pulldown);
  Serial.print(" d=");
  Serial.println(digitalPulldown);

  pinMode(pin, INPUT);
  analogRead(pin);
  analogSetPinAttenuation(pin, ADC_11db);
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  analogReadResolution(12);
  pinMode(FSR_1_PIN, INPUT);
  pinMode(FSR_2_PIN, INPUT);
  analogRead(FSR_1_PIN);
  analogRead(FSR_2_PIN);
  analogSetPinAttenuation(FSR_1_PIN, ADC_11db);
  analogSetPinAttenuation(FSR_2_PIN, ADC_11db);

  Serial.println("# FSR Pin Mode Diagnostic Started");
  Serial.println("# Press sensors while this runs. If pullup stays 0, that GPIO is held to GND.");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
  lastSampleAt = now;

  printPinDiag("FSR1", FSR_1_PIN);
  printPinDiag("FSR2", FSR_2_PIN);
  Serial.println("---");
}
