#define WATCHDOG_OUT_PIN 7   // Arduino to Pi
#define WATCHDOG_IN_PIN 8    // Pi echo to Arduino
#define MORSE_OUTPUT_PIN 9   // For buzzer or tone output

unsigned long lastPulseTime = 0;
unsigned long lastFailTime = 0;
bool piHealthy = true;
bool inFailsafe = false;

void setup() {
  pinMode(WATCHDOG_OUT_PIN, OUTPUT);
  pinMode(WATCHDOG_IN_PIN, INPUT);
  pinMode(MORSE_OUTPUT_PIN, OUTPUT);

  digitalWrite(WATCHDOG_OUT_PIN, LOW);
}

void loop() {
  unsigned long now = millis();

  // Pulse to Pi every second
  if (now - lastPulseTime >= 1000) {
    lastPulseTime = now;

    // Send watchdog pulse
    digitalWrite(WATCHDOG_OUT_PIN, HIGH);
    delay(10);
    digitalWrite(WATCHDOG_OUT_PIN, LOW);

    // Wait up to 100ms for echo from Pi
    bool echoed = false;
    unsigned long timeout = millis();
    while (millis() - timeout < 100) {
      if (digitalRead(WATCHDOG_IN_PIN) == HIGH) {
        echoed = true;
        break;
      }
    }

    if (!echoed) {
      if (piHealthy) {
        // First failure
        lastFailTime = now;
      }
      piHealthy = false;
    } else {
      piHealthy = true;
      inFailsafe = false;
    }
  }

  // If Pi has been unhealthy for 3 seconds, enter failsafe
  if (!piHealthy && !inFailsafe && millis() - lastFailTime > 3000) {
    enterFailsafe();
  }
}

void enterFailsafe() {
  inFailsafe = true;
  playMorse("PI FAILED");
}

void playMorse(const char* message) {
  // Basic tone output for Morse Code, replace with actual Morse function if needed
  while (*message) {
    if (*message != ' ') {
      tone(MORSE_OUTPUT_PIN, 700, 100);  // Tone 700 Hz for 100 ms
      delay(200);
    } else {
      delay(400);  // Inter-word gap
    }
    message++;
  }
}
