# Repeater Controller and Shack Monitoring System

## Overview
This program (`main.js`) is a Raspberry Pi–based repeater controller and shack monitoring system.  
It integrates GPIO hardware control, sensor monitoring, text-to-speech (TTS) announcements, and DTMF (Dual-Tone Multi-Frequency) command decoding to provide **remote monitoring, alerting, and control** for a ham radio repeater.

**Capabilities:**
- Sensor monitoring (temperature, door, AC line voltage, battery voltage)
- Automated alert system (door intrusion, voltage issues)
- Repeater control via GPIO
- DTMF-controlled operations
- Spoken responses with TTS
- Random affirmations for user interaction

---

## Imported Modules
- `affirmation.js` → random affirmations
- `pigpio` → GPIO control
- `sensor_reader.js` → ADC + sensor polling
- `tts.js` → speech, status checks, and keying control
- `dtmf_decoder.js` → handles DTMF tone input

---

## Constants

| Constant                | Value        | Purpose                               |
|--------------------------|-------------|---------------------------------------|
| `AC_VOLTAGE_LOW`         | 100 V       | Minimum acceptable AC line voltage    |
| `AC_VOLTAGE_HIGH`        | 128 V       | Maximum acceptable AC line voltage    |
| `DC_VOLTAGE_LOW`         | 11.0 V      | Minimum acceptable battery voltage    |
| `DC_VOLTAGE_HIGH`        | 14.8 V      | Maximum acceptable battery voltage    |
| `ALERT_REPEAT_MS`        | 30 min      | Repeat interval for alerts            |
| `REPEATER_RESET_TIMEOUT` | 10 min      | Reset pulse duration for repeater     |
| `TX_DELAY`               | 1 sec       | Delay between TTS and actions         |

---

## Sensor Thresholds

| Sensor        | Normal Range   | Alert Condition      |
|---------------|----------------|----------------------|
| AC Voltage    | 100–128 V      | <100 V or >128 V     |
| DC Voltage    | 11.0–14.8 V    | <11.0 V or >14.8 V   |
| Door State    | Closed (0)     | Transition from 0→1  |
| Temperature   | N/A            | Monitored only       |

---

## DTMF Command Reference

| Command           | Function                                                     |
|-------------------|--------------------------------------------------------------|
| `AFFIRMATION`     | Speaks a random affirmation                                  |
| `RESET_REPEATER`  | Pulses repeater GPIO high for 2 min, then low                |
| `REPEATER_LOW`    | Forces repeater GPIO low                                     |
| `REPEATER_HIGH`   | Forces repeater GPIO high                                    |
| `STATUS`          | Reports system state (door, temp, line, battery, alerts)     |
| `ALERT_ON`        | Enable alerts                                                |
| `ALERT_OFF`       | Disable alerts, clear timers if active                       |
| `PTT_ON`          | Activates push-to-talk                                       |
| `PTT_ON_TIMED`    | Activates push-to-talk with a timer                          |
| `PTT_OFF`         | Deactivates push-to-talk                                     |
| `EXIT`            | Stops timers and exits                                       |

---

## System Architecture
```mermaid
flowchart TD
    S[Sensors (ADC)<br/>- Door switch<br/>- AC voltage<br/>- DC battery<br/>- Temperature]
    R[Raspberry Pi 4<br/>main.js<br/>- pollSensors<br/>- Alerts<br/>- GPIO control]
    G[pigpio GPIO<br/>Repeater PTT]
    T[TTS<br/>(speak, isProcessing)]
    A[Audio Output (Radio)]

    S --> R
    R --> G
    R --> T
    T --> A
```
