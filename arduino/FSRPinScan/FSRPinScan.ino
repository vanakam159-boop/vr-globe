/*
 * FSR Pin Scan - ESP32-S3
 * =======================
 *
 * Scans common ESP32-S3 ADC GPIOs so we can find where the FSR voltage
 * actually appears. Press each FSR while this sketch is running.
 */

const int ADC_PINS[] = {
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20
};

const int PIN_COUNT = sizeof(ADC_PINS) / sizeof(ADC_PINS[0]);
const unsigned long SAMPLE_INTERVAL_MS = 500;
const int ADC_SAMPLE_COUNT = 6;
const int CHANGE_THRESHOLD = 40;

int baseline[PIN_COUNT];
unsigned long lastSampleAt = 0;

int readAverage(int pin) {
  long total = 0;
  for (int i = 0; i < ADC_SAMPLE_COUNT; i += 1) {
    total += analogRead(pin);
    delay(1);
  }
  return total / ADC_SAMPLE_COUNT;
}

void printAllReadings() {
  Serial.print("ALL");
  for (int i = 0; i < PIN_COUNT; i += 1) {
    int pin = ADC_PINS[i];
    int raw = readAverage(pin);
    Serial.print(" G");
    Serial.print(pin);
    Serial.print(":");
    Serial.print(raw);
  }
  Serial.println();
}

void printChangedReadings() {
  bool anyChanged = false;

  Serial.print("CHANGED");
  for (int i = 0; i < PIN_COUNT; i += 1) {
    int pin = ADC_PINS[i];
    int raw = readAverage(pin);
    int delta = raw - baseline[i];
    if (abs(delta) >= CHANGE_THRESHOLD || raw > CHANGE_THRESHOLD) {
      anyChanged = true;
      Serial.print(" G");
      Serial.print(pin);
      Serial.print(":");
      Serial.print(raw);
      Serial.print("(");
      if (delta >= 0) Serial.print("+");
      Serial.print(delta);
      Serial.print(")");
    }
  }

  if (!anyChanged) {
    Serial.print(" none");
  }
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  analogReadResolution(12);
  for (int i = 0; i < PIN_COUNT; i += 1) {
    pinMode(ADC_PINS[i], INPUT);
    analogRead(ADC_PINS[i]);
    analogSetPinAttenuation(ADC_PINS[i], ADC_11db);
    analogRead(ADC_PINS[i]);
  }

  delay(300);
  for (int i = 0; i < PIN_COUNT; i += 1) {
    baseline[i] = readAverage(ADC_PINS[i]);
  }

  Serial.println("# FSR Pin Scan Started");
  Serial.println("# Press each FSR. Any active ADC pin will show in CHANGED lines.");
  Serial.println("# Full baseline:");
  printAllReadings();
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
  lastSampleAt = now;

  printChangedReadings();
}
