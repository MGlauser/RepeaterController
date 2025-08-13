// main.js
import { getRandomAffirmation } from "../affirmation.js";
import { Gpio } from "pigpio";
import { initADC, readSensors } from "../sensor_reader.js";
import { speak } from "../tts.js";
import { startDTMFDecoder, stopDTMFDecoder } from '../dtmf_decoder.js';

let alertsEnabled = true; // Set to false to disable alerts
let doorAlertActive = false;
let doorAlertTimer = null;
let pollTimer = null;
let lastDoorState = null;
let sensorData = {};
let acVoltageAlertActive = false;
let dcVoltageAlertActive = false;
let voltageAlertTimer = null;

const AC_VOLTAGE_LOW = 105;
const AC_VOLTAGE_HIGH = 125;
const DC_VOLTAGE_LOW = 11.0;
const DC_VOLTAGE_HIGH = 14.8;
const ALERT_REPEAT_MS = 1000 * 60 * 2; // 1 minute 30 * 60 * 1000; // 30 minutes
const REPEATER_RESET_TIMEOUT = 1000 * 60 * 2; // 2 minute timer.

const TX_DELAY = 1000; // ms to wait after speaking to do something else.

const repeaterPin = new Gpio(25, { mode: Gpio.OUTPUT });

function logAlert(msg) {
  console.log(`[ALERT] ${msg}`);
}

// Sample DTMF code table
const dtmfLookup = {
  4200: "AFFIRMATION",
  4201: "ALERT_ON",
  4202: "ALERT_OFF",
  4223: "RESET_REPEATER",
  4220: "REPEATER_LOW",
  4221: "REPEATER_HIGH",
  4111: "STATUS",
  9999: "EXIT" // this RESTARTS the application because PM2 keeps it alive.
};

async function pollSensors() {
  try {
    await initADC(); // can be called as many times as you wish.  It knows if it's already been called.
    const data = await readSensors();
    sensorData = data;
    // console.log("Sensor Data:", data);

    if (alertsEnabled) {
      // Door alert logic
      const doorOpened = lastDoorState === 0 && data.door === 1;
      const doorClosed = lastDoorState === 1 && data.door === 0;

      if (doorOpened && !doorAlertActive) {
        doorAlertActive = true;
        await speak("Alert. Intrusion detected at shack door.");
        logAlert("DOOR OPENED - ALERT TRIGGERED");
        doorAlertTimer = setInterval(async () => {
          await speak("Repeating alert. Intrusion detected at shack door.");
          logAlert("DOOR ALERT REPEATED");
        }, ALERT_REPEAT_MS);
      }

      if (doorClosed && doorAlertActive) {
        doorAlertActive = false;
        if (doorAlertTimer) {
          clearInterval(doorAlertTimer);
          doorAlertTimer = null;
        }
        logAlert("DOOR CLOSED - ALERT CLEARED");
        await speak("Shack door closed.");
      }

      lastDoorState = data.door;

      // AC Voltage alert logic
      const acVoltageAbnormal =
        data.acVoltage < AC_VOLTAGE_LOW || data.acVoltage > AC_VOLTAGE_HIGH;

      if (acVoltageAbnormal && !acVoltageAlertActive) {
        await speak(`Warning. Line voltage abnormal.  ${data.acVoltage} Volts`);
        logAlert(`Line VOLTAGE ALERT TRIGGERED: ${data.acVoltage}V`);
        acVoltageAlertActive = true;
        voltageAlertTimer = setInterval(async () => {
          await speak(`Repeat warning. Line voltage abnormal. ${data.acVoltage} Volts`);
          logAlert(`Line VOLTAGE ALERT REPEATED: ${data.acVoltage} Volts`);
        }, ALERT_REPEAT_MS);
      }

      if (!acVoltageAbnormal && acVoltageAlertActive) {
        acVoltageAlertActive = false;
        if (voltageAlertTimer) {
          clearInterval(voltageAlertTimer);
          voltageAlertTimer = null;
        }
        const msg = `Line VOLTAGE NORMALIZED: ${data.acVoltage} Volts - ALERT CLEARED`;
        await speak(msg);
        logAlert(msg);
      }

      // DC Voltage alert logic
      const dcVoltageAbnormal =
        data.batteryVoltage < DC_VOLTAGE_LOW || data.batteryVoltage > DC_VOLTAGE_HIGH;
      if (dcVoltageAbnormal && !dcVoltageAlertActive) {
        dcVoltageAlertActive = true;
        await speak(`Warning. Battery voltage abnormal. ${data.batteryVoltage} Volts`);
        logAlert(`Battery VOLTAGE ALERT TRIGGERED: ${data.batteryVoltage} Volts`);
        voltageAlertTimer = setInterval(async () => {
          await speak("Repeat warning. Battery voltage abnormal.");
          const msg = `Battery VOLTAGE ALERT REPEATED: ${data.batteryVoltage} Volts`
          await speak(msg);
          logAlert(msg);
        }, ALERT_REPEAT_MS);
      }

      if (!dcVoltageAbnormal && dcVoltageAlertActive) {
        dcVoltageAlertActive = false;
        if (voltageAlertTimer) {
          clearInterval(voltageAlertTimer);
          voltageAlertTimer = null;
        }
        const msg = `BATTERY VOLTAGE NORMALIZED: ${data.batteryVoltage} Volts - ALERT CLEARED`;
        await speak(msg);
        logAlert(msg);
      }


    }
  } catch (err) {
    console.error("Sensor polling error:", err);
  }
}

startDTMFDecoder((code) => {
  const action = dtmfLookup[code];
  console.log('DTMF Code received:', action);
  switch (action) {
    case 'AFFIRMATION':
      setTimeout(async () => {
        await speak(getRandomAffirmation());
      }, TX_DELAY)
      break;

    case "RESET_REPEATER":
      setTimeout(async () => {
        repeaterPin.digitalWrite(1);
        await speak("Resetting repeater.");
        setTimeout(() => repeaterPin.digitalWrite(0), REPEATER_RESET_TIMEOUT);
      }, TX_DELAY);
      break;

    case "REPEATER_LOW":
      setTimeout(async () => {
        repeaterPin.digitalWrite(0);
        await speak("Repeater pin pulled low.");
      }, TX_DELAY);
      break;

    case "REPEATER_HIGH":
      setTimeout(async () => {
        repeaterPin.digitalWrite(1);
        await speak("Repeater pin set high.");
      }, TX_DELAY);
      break;

    case "STATUS": {
      setTimeout(async () => {
        const status = `Alerts ${alertsEnabled ? 'enabled' : 'disabled'

          }, Door is ${sensorData.door ? "open" : "closed"
          }, temperature is ${sensorData.temp
          } degrees, line is ${sensorData.acVoltage} volts, battery is ${sensorData.batteryVoltage} volts.`;
        await speak(status);
      }, TX_DELAY);
      break;
    }


    case "ALERT_ON":
      alertsEnabled = true;
      setTimeout(async () => {
        await speak("Alerts have been enabled.");
      }, TX_DELAY);
      break;

    case "ALERT_OFF":
      alertsEnabled = false;
      setTimeout(async () => {
        await speak("Alerts have been disabled.");

        if (doorAlertActive || acVoltageAlertActive || dcVoltageAlertActive) {
          await speak("Alerts acknowledged. Shutting up.");
          logAlert("DTMF 'SILIENCE!' RECEIVED: ALERTS ACKNOWLEDGED");

          if (doorAlertTimer) {
            clearInterval(doorAlertTimer);
            doorAlertTimer = null;
          }
          if (voltageAlertTimer) {
            clearInterval(voltageAlertTimer);
            voltageAlertTimer = null;
          }

          alertsEnabled = !alertsEnabled;
          doorAlertActive = false;
          acVoltageAlertActive = false;
          dcVoltageAlertActive = false;
        } else {
          await speak("No active alerts to acknowledge.");
        }
      }, TX_DELAY);
      break;


    // MUST BE LAST case statement before default.  No break.
    case 'EXIT':
      // not strictly necessary, but good housekeeping practice.
      clearInterval(doorAlertTimer);
      clearInterval(pollTimer);
      doorAlertTimer = null;
      pollTimer = null;

      process.exit(0);

    default:
      setTimeout(async () => {
        await speak(`${code} is not assigned.`);
      }, TX_DELAY);
  }
});



// Send a random affirmation once at startup
(async () => {
  
  await speak(getRandomAffirmation());
  await pollSensors(); // set initial values

  // transmit these initial values when starting up.
  setTimeout(async () => {
    const status = `Door is ${sensorData.door ? "open" : "closed"
      }, temperature is ${sensorData.temp
      } degrees, line is ${sensorData.acVoltage} volts, battery is ${sensorData.batteryVoltage} volts.`;
    await speak(status);

    pollTimer = setInterval(async () => {
      await pollSensors();
    }, 3000);
  }, TX_DELAY);


})();
