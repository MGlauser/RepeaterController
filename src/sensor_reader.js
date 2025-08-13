// sensor_reader.js
import { Gpio } from "pigpio";
import Ads1x15 from "ads1x15";
import DHTSensor from "node-dht-sensor";

// GPIO assignments
const doorPin = new Gpio(18, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_UP,
  alert: true
});
doorPin.glitchFilter(100000);

doorPin.on("alert", (level, tick) => {
  console.log("Door pin change:", level);
});

const WATCHDOG_IN_GPIO = 24;
const WATCHDOG_OUT_GPIO = 26;

const watchdogIn = new Gpio(WATCHDOG_IN_GPIO, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
  alert: true
});
watchdogIn.glitchFilter(1000);

const watchdogOut = new Gpio(WATCHDOG_OUT_GPIO, { mode: Gpio.OUTPUT });
watchdogOut.digitalWrite(0);

watchdogIn.on("alert", (level, tick) => {
  if (level === 1) {
    watchdogOut.digitalWrite(1);
    setTimeout(() => watchdogOut.digitalWrite(0), 100);
  }
});


const BATTERY_CHANNEL = 0;
const AC_CHANNEL = 1;
const chip = 1; // 1 = ADS1115, 0 = ADS1015
const adc = new Ads1x15(chip);

const PGA = '4096';  // Programmable Gain Amplifier ±4.096V
const SPS = 250;     // Samples per second
let initDone = false;

// Initialize and open the i2c bus (must await before reads)
async function initADC() {
  if (!initDone) {
    await adc.openBus(1);
    initDone = true;
  }
}

function readADC(channel) {
  return new Promise(async (resolve, reject) => {
    if (adc.busy) {
      console.error('ADC busy');
      reject(new Error("ADC busy"));
      return;
    }

    try {
      const measure = await adc.readSingleEnded({ channel });
      resolve(measure / 1000);
    } catch (err) {
      console.error(`readSingEnded error: ${err}`);
      reject(err);
    }

    // adc.readADCSingleEnded(channel, PGA, SPS, (err, data) => {
    //   if (err) {
    //     reject(err);
    //   } else {
    //     // data is in millivolts, convert to volts
    //     resolve(data / 1000);
    //   }
    // });
  });
}

/**
 * Read voltage on a channel and apply voltage divider scaling
 * @param {number} channel ADC channel number (0-3)
 * @param {number} dividerRatio voltage divider ratio (default 3.7)
 * @param {number} samples smooths out the value by getting the mean of (n) samples.
 * @returns {Promise<number>} scaled voltage in volts
 */
async function readVoltage(channel, dividerRatio = 3.7, samples = 10) {
  try {
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const voltage = await readADC(channel);
      // console.log(`readVoltage channel ${channel} raw reading ${i + 1}: ${voltage}`);
      sum += voltage;
    }
    const meanVoltage = sum / samples;
    // console.log(`readVoltage channel ${channel} raw (mean value): ${meanVoltage}`);
    return meanVoltage * dividerRatio;
  } catch (err) {
    console.error(err);
    return -1;
  }
}



function convertCelsiusToFahrenheit(celsius) {
  return (celsius * 9 / 5) + 32;
}

function readDHT() {
  return new Promise((resolve) => {
    DHTSensor.read(11, 23, (err, temperatureCelsius) => { // Rename to reflect Celsius
      if (err || isNaN(temperatureCelsius)) {
        resolve({ temp: null });
      } else {
        const temperatureFahrenheit = convertCelsiusToFahrenheit(temperatureCelsius);
        resolve({ temp: parseFloat(temperatureFahrenheit.toFixed(1)) });
      }
    });
  });
}

let count = 0;
async function readSensors() {
  // console.log('readSensors...');
  count++;


  const tempData = await readDHT();
  const door = doorPin.digitalRead();

  let batteryVoltage = parseFloat(await readVoltage(BATTERY_CHANNEL, 4.096, 20)).toFixed(1);
  // console.log('batteryVoltage ', batteryVoltage);
  let acVoltage = Math.floor(await readVoltage(AC_CHANNEL, 44.0, 20)).toFixed(0);
  // console.log('acVoltage ', acVoltage);

  // if (count > 10) {
  //   acVoltage = 100; // should trip alert
  // }

  // if (count > 20) {
  //   batteryVoltage = 10.4;
  // }

  return {
    door,
    temp: tempData.temp,
    batteryVoltage,
    acVoltage
  };
}

export { initADC, readSensors };