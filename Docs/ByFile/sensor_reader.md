# Sensor Reader Module (`sensor_reader.js`)

This module handles hardware sensor inputs for the repeater system, including **door monitoring**, **watchdog signaling**, **analog voltage sensing** (battery + AC), and **temperature sensing** with a DHT11 sensor.

---

## Features

- **Door Sensor (GPIO 18)**  
  - Uses `pigpio` with pull-up resistor and glitch filter.  
  - Detects door open/close state via interrupt (`alert` event).  

- **Watchdog (GPIO 24 in / GPIO 26 out)**  
  - Listens for watchdog pulses on GPIO 24.  
  - Responds by toggling GPIO 26 high for 100 ms.  
  - Ensures the Raspberry Pi remains responsive.  

- **ADC Voltage Measurement (ADS1115 / ADS1015)**  
  - Reads **Battery Voltage (channel 0)**  
  - Reads **AC Voltage (channel 1)**  
  - Scales values via configurable voltage divider ratios.  
  - Uses averaging over `n` samples for smoothing.  

- **Temperature Sensor (DHT11 on GPIO 23)**  
  - Reads Celsius and converts to Fahrenheit.  
  - Returns `null` if sensor fails or data is invalid.  

---

## Pin Assignments

| Function          | GPIO Pin | Mode   | Notes                                |
|-------------------|----------|--------|--------------------------------------|
| Door Sensor       | 18       | INPUT  | Pull-up, glitch filter enabled       |
| Watchdog In       | 24       | INPUT  | Pull-down, glitch filter             |
| Watchdog Out      | 26       | OUTPUT | Pulses high for 100 ms on watchdog   |
| DHT11 Temp Sensor | 23       | INPUT  | Special timing, Celsius → Fahrenheit |

---

## ADC Setup (ADS1x15)

| Channel | Signal            | Divider Ratio | Notes                     |
|---------|-------------------|---------------|---------------------------|
| 0       | Battery Voltage   | 4.096         | SLA 12V battery monitor   |
| 1       | AC Transformer    | 44.0          | Half-wave rectified input |

- **PGA (Programmable Gain Amplifier):** ±4.096V  
- **SPS (Samples per Second):** 250  
- Reads are averaged over multiple samples for stability.  

---

## Functions

### `async initADC()`
Initializes the ADS1115/ADS1015 ADC over I²C (bus 1).  
Must be called before any voltage readings.  

---

### `readADC(channel: number): Promise<number>`
Reads a single channel from the ADC.  
- Returns voltage in **volts**.  
- Rejects if ADC is busy.  

---

### `async readVoltage(channel: number, dividerRatio = 3.7, samples = 10): Promise<number>`
Reads and averages voltage from a channel.  
- Applies voltage divider ratio.  
- Smooths results using multiple samples.  
- Returns scaled voltage in **volts**.  

---

### `readDHT(): Promise<{ temp: number|null }>`
Reads temperature from DHT11 sensor.  
- Returns `{ temp: <°F> }`  
- Returns `{ temp: null }` if sensor fails.  

---

### `async readSensors(): Promise<{ door, temp, batteryVoltage, acVoltage }>`
Main entry point to read all sensors at once.  
Returns an object:

```json
{
  "door": 0,
  "temp": 72.5,
  "batteryVoltage": 12.6,
  "acVoltage": 120
}
```

## Flow diagram
```mermaid
flowchart TD
    D[Door Sensor GPIO 18] --> R[readSensors()]
    W[Watchdog GPIO 24/26] --> R
    B[Battery Voltage (ADC Ch0)] --> R
    A[AC Voltage (ADC Ch1)] --> R
    T[DHT11 Temp GPIO 23] --> R
    R --> O[Output JSON]
```
