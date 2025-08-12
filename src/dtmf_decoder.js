import { Gpio } from 'pigpio';

const torPin = new Gpio(17, { mode: Gpio.INPUT });
const dtmfPins = [4, 5, 6, 13].map(pin => new Gpio(pin, { mode: Gpio.INPUT }));
const strobePin = new Gpio(27, { mode: Gpio.INPUT, alert: true });

let code = '';
let timeoutId = null;

// DTMF mapping table
const dtmfMap = {
  10: '0', 1: '1', 2: '2', 3: '3',
  4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 11: '*', 12: '#',
  13: 'A', 14: 'B', 15: 'C', 0: 'D'
};


function resetTimeout() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function resetCodeAndTimeout() {
  code = '';
  resetTimeout();
}

function startTimeout() {
  resetTimeout();
  timeoutId = setTimeout(() => {
    resetCodeAndTimeout();
    console.log('DTMF sequence timed out. Code reset.');
  }, 10000); // 10 seconds timeout
}

/**
 * Starts listening for DTMF codes.
 * @param {(code: string) => void} onCodeComplete Callback invoked with 4-digit code when received.
 */
export function startDTMFDecoder(onCodeComplete) {
  strobePin.glitchFilter(10000);

  strobePin.on('alert', (level) => {
    const torPinValue = torPin.digitalRead();
    console.log(`startDTMFDecoder#on"alert", level: ${level}, torPinValue: ${torPinValue}`);
    if (level === 1) { // && torPinValue === 1) {
      // TOR is high, valid signal

      const value = dtmfPins.reduce((acc, pin, i) => acc | (pin.digitalRead() << i), 0);
      const dtmfChar = dtmfMap[value]; // Use the mapping table

      if (dtmfChar !== undefined) { // Ensure a valid DTMF character is found
        code += dtmfChar;
        startTimeout();
        console.log(`value ${value}, dtmfChar: ${dtmfChar}, code: ${code}`);
        if (code.length === 4) {
          onCodeComplete(code);
          resetCodeAndTimeout();
        }
      } else {
        console.warn(`Unknown DTMF value received: ${value}`);
      }
    }
  });
}

/**
 * Stops the DTMF decoder and clears resources.
 */
export function stopDTMFDecoder() {
  strobePin.disableAlert();
  resetCodeAndTimeout();
}
