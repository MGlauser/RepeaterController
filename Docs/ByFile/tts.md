# TTS Module Analysis

This document provides an analysis of the `tts.js` file, which is a Node.js module designed to handle Text-to-Speech (TTS) functionality with integration to hardware controls using GPIO pins.

## Imports

- **Gpio from "pigpio"**: This library allows control of GPIO pins on Raspberry Pi.
- **execSync and spawn from "child_process"**: These functions are used for executing shell commands synchronously or asynchronously.
- **FifoQueue from './classes/fifo.js'**: Custom event queue class for managing TTS tasks.

## Constants

- `REPEATER_ID`: Contains the repeater identification string.
- `KEY` and `UNKEY`: Define constants for GPIO pin states (keyed and unkeyed).
- `idTimer` and `keyTimer`: Timers used to manage the periodic ID announcement and keying timing.
- `txKey`: GPIO pin 22, configured as an output for controlling PTT.

## Functions

### getAlsaDeviceInfo(preferredName)

This function lists available ALSA (Advanced Linux Sound Architecture) devices and attempts to find a preferred device by name. If found, it returns the card number, card name, and device number.

```javascript
function getAlsaDeviceInfo(preferredName = 'AB13X USB Audio') {
  // ...
}
```

### isProcessing()

Returns whether the TTS queue is currently processing an item.

```javascript
export function isProcessing() {
  return ttsQueue.isProcessing;
}
```

### sendID(extra)

This function sends the repeater ID periodically (every 10 minutes). It enqueues a message to speak the ID and sets a timer for the next announcement.

```javascript
async function sendID(extra = '.') {
  // ...
}
```

### speak(text)

Enqueues text to be spoken. Calls `sendID` before enqueueing the actual speech content.

```javascript
export async function speak(text) {
  await sendID();
  ttsQueue.enqueue({ content: text }, innerSpeak);
}
```

### innerSpeak(message)

Executes the TTS using Festival, a general framework for building speech synthesis systems as well as an example implementation of a TTS system. The function handles PTT (Push-to-Talk) on/off signals via GPIO and writes the command to speak text.

```javascript
async function innerSpeak(message) {
  return new Promise((resolve, reject) => {
    const text = message.content;
    console.log(`innerSpeak text: ${text}`);
    if (!text) return resolve();
    try {
      // Handle PTT and TTS execution
      txKey.digitalWrite(KEY);

      const tts = spawn('festival', ['--pipe']);
      tts.stdin.write(audioCommand);
      tts.stdin.write(`(SayText "${text.replace(/"/g, '\\"')}")\n`);
      tts.stdin.end();

      tts.on('close', (code) => {
        txKey.digitalWrite(UNKEY);
        resolve(code === 0);
      });

      tts.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}
```

### key_command(command)

Handles PTT commands to control the keying of the GPIO pin for a specified duration or indefinitely.

```javascript
export function key_command(command) {
  let KEY_TIMER_TIME = 1000 * 60 * 10; // default to 10 minutes
  console.log(`key_command() command: ${command}`);
  switch (command) {
    case "PTT_ON_TIMED":
      KEY_TIMER_TIME = 1000 * 60 * 2; // On for 2 minutes

    case "PTT_ON":
      sendID();
      txKey.digitalWrite(KEY);
      if (keyTimer){
        clearInterval(keyTimer);
        keyTimer = null;
      }
      keyTimer = setTimeout(() => {
        txKey.digitalWrite(UNKEY);
      }, KEY_TIMER_TIME) // 10 minutes max
      break;

    default:
      if (keyTimer){
        clearInterval(keyTimer);
        keyTimer = null;
      }
      txKey.digitalWrite(UNKEY);
  }
}
```

## Summary

The `tts.js` module provides a complete solution for TTS with hardware PTT control on GPIO. It utilizes ALSA to identify the appropriate audio device, manages periodic announcements using timers, and enqueues speech tasks efficiently using a custom queue 
implementation.
