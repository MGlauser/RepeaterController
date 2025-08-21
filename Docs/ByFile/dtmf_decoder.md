# DTMF Decoder Module

## Overview
This module provides a **Dual-Tone Multi-Frequency (DTMF) decoder** interface using the Raspberry Pi’s GPIO pins via the `pigpio` library.  
It listens for DTMF tones (detected via external hardware, e.g., an **MT8870 decoder**) and reconstructs **4-digit DTMF codes** for use in repeater control and remote command applications.

---

## Imported Modules
- `pigpio` → Provides low-level access to GPIO pins (`Gpio`).

---

## Pin Assignments

| GPIO Pin | Function                          |
|----------|-----------------------------------|
| **17**   | TOR (Tone on Receive) input       |
| **4, 5, 6, 13** | DTMF Q1–Q4 digital outputs (binary) |
| **27**   | Strobe input (edge-triggered, with alert) |

---

## Constants

- **`dtmfMap`** → Lookup table mapping binary Q1–Q4 values (0–15) to DTMF characters.

| Binary Value | DTMF Char |
|--------------|------------|
| 1–9          | `1`–`9`    |
| 10           | `0`        |
| 11           | `*`        |
| 12           | `#`        |
| 13           | `A`        |
| 14           | `B`        |
| 15           | `C`        |
| 0            | `D`        |

---

## Timeout Handling
The module uses a **10-second timeout** window for building DTMF sequences:  
- Each detected digit restarts the timer.  
- If no further digits arrive within 10 seconds, the sequence resets.  
- When 4 digits are collected, the callback function (`onCodeComplete`) is invoked.

---

## Functions

### `startDTMFDecoder(onCodeComplete)`
Starts listening for DTMF tones.  

**Parameters**:
- `onCodeComplete (code: string)` → Callback function invoked when a **4-digit code** is fully received.  

**Behavior**:
1. Configures `strobePin` with a glitch filter (10 μs).  
2. On each strobe **alert rising edge** (`level === 1`):  
   - Reads the 4 DTMF pins (`Q1–Q4`) to get a binary value.  
   - Maps the value to a DTMF character using `dtmfMap`.  
   - Appends the character to the active sequence.  
   - Resets/starts the **10-second timeout**.  
   - If sequence length = 4, invokes `onCodeComplete` and clears the buffer.  

---

### `stopDTMFDecoder()`
Stops listening for DTMF tones and clears resources.  

**Behavior**:
- Disables strobe pin alerts.  
- Resets current sequence and timeout.  

---

## System Flow

```mermaid
flowchart TD
    S[DTMF Strobe Detected] --> C{Level == 1?}
    C -- No --> X[Ignore]
    C -- Yes --> R[Read Q1-Q4 GPIO]
    R --> M[Map binary value to DTMF char]
    M --> V{Valid DTMF char?}
    V -- No --> W[Log Warning: Unknown value]
    V -- Yes --> A[Append char to code]
    A --> T[Restart 10s Timeout]
    T --> L{Code length == 4?}
    L -- No --> S
    L -- Yes --> O[Invoke onCodeComplete(code)]
    O --> RST[Reset code + timeout]
```