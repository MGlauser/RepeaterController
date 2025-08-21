// main.js
// DO NOT USE THIS FILE.
import { fileURLToPath } from "url";
import { Gpio } from "onoff";
import { Worker } from "worker_threads";
import express from "express";
import fs from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Sample DTMF code table
const dtmfLookup = {
  4200: "AFFIRMATION",
  4201: "ALERT_ON",
  4202: "ALERT_OFF",
  4223: "RESET_REPEATER",
  4220: "REPEATER_LOW",
  4221: "REPEATER_HIGH",
  4299: "SILENCE!",
  4411: "STATUS",
};

const affirmationWorker = new Worker(path.join(__dirname, './affirmation.js'));
const sensorWorker = new Worker(path.join(__dirname, "./sensor_reader.js"));
const ttsWorker = new Worker(path.join(__dirname, "./tts.js"));
const dtmfWorker = new Worker(path.join(__dirname, "./dtmf_decoder.js"));

// Sensor data store
let sensorData = {};
let alertsEnabled = false;

let lastDoorState = null;
let lastVoltageAlert = false;

let doorAlertActive = false;
let voltageAlertActive = false;

let doorAlertTimer = null;
let voltageAlertTimer = null;

const VOLTAGE_LOW = 105;
const VOLTAGE_HIGH = 125;

const ALERT_REPEAT_MS = 30 * 60 * 1000; // 30 minutes

affirmationWorker.on('message', (affirmation) => {
  console.log('Received affirmation:', affirmation);
  ttsWorker.postMessage(affirmation);
});

affirmationWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

affirmationWorker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Worker stopped with exit code ${code}`);
  }
});


dtmfWorker.on("message", (dtmfCode) => {
  console.log("Received DTMF code from worker:", dtmfCode);
  handleDTMF(dtmfCode);
});

dtmfWorker.on("error", (error) => {
  console.error("DTMF worker encountered an error:", error);
});

dtmfWorker.on("exit", (code) => {
  if (code !== 0) {
    console.error(`DTMF worker stopped with exit code ${code}`);
  }
});

sensorWorker.on("message", (data) => {
  sensorData = data;

  if (alertsEnabled) {
    // Door alert management
    if (alertsEnabled) {
      const doorOpened = lastDoorState === false && data.door === true;
      const doorClosed = lastDoorState === true && data.door === false;

      if (doorOpened) {
        if (!doorAlertActive) {
          ttsWorker.postMessage("Alert. Intrusion detected at shack door.");
          logAlert("DOOR OPENED - ALERT TRIGGERED");
          doorAlertActive = true;

          doorAlertTimer = setInterval(() => {
            ttsWorker.postMessage(
              "Repeat alert. Intrusion detected at shack door."
            );
            logAlert("DOOR ALERT REPEATED");
          }, ALERT_REPEAT_MS);
        }
      }

      if (doorClosed && doorAlertActive) {
        // Reset the flag so we can trigger again on the next open
        doorAlertActive = false;
        if (doorAlertTimer) {
          clearInterval(doorAlertTimer);
          doorAlertTimer = null;
        }
        logAlert("DOOR CLOSED - ALERT CLEARED");
      }

      lastDoorState = data.door;
    }

    // --- Voltage Alert ---
    const voltageAbnormal =
      data.voltage < VOLTAGE_LOW || data.voltage > VOLTAGE_HIGH;

    if (voltageAbnormal && !voltageAlertActive) {
      ttsWorker.postMessage("Warning. Line voltage abnormal.");
      logAlert(`VOLTAGE ALERT TRIGGERED: ${data.voltage}V`);
      voltageAlertActive = true;

      voltageAlertTimer = setInterval(() => {
        ttsWorker.postMessage("Repeat warning. Line voltage abnormal.");
        logAlert(`VOLTAGE ALERT REPEATED: ${data.voltage}V`);
      }, ALERT_REPEAT_MS);
    }

    if (!voltageAbnormal && voltageAlertActive) {
      voltageAlertActive = false;
      if (voltageAlertTimer) {
        clearInterval(voltageAlertTimer);
        voltageAlertTimer = null;
      }
      logAlert(`VOLTAGE NORMALIZED: ${data.voltage}V - ALERT CLEARED`);
    }
  }
});

ttsWorker.on("error", (err) => console.error("TTS Worker Error:", err));
sensorWorker.on("error", (err) => console.error("Sensor Worker Error:", err));


// Start DTMF decode loop
function handleDTMF(code) {
  const action = dtmfLookup[code];
  console.log(`Received DTMF code: ${code} => ${action}`);

  switch (action) {
    case "AFFIRMATION":
      let text = "Hello handsome";
      // lookup a random affirmation and replace default.
      affirmationWorker.postMessage('Ignored');
      break;

    case "ALERT_ON":
      alertsEnabled = true;
      ttsWorker.postMessage("Alerts have been enabled.");
      break;

    case "ALERT_OFF":
      alertsEnabled = false;
      ttsWorker.postMessage("Alerts have been disabled.");
      break;

    case "STATUS": {
      const status = `Door is ${
        sensorData.door ? "open" : "closed"
      }, temperature is ${
        sensorData.temp
      } degrees Celsius, and line voltage is ${sensorData.voltage} volts.`;
      ttsWorker.postMessage(status);
      break;
    }

    case "RESET_REPEATER":
      ttsWorker.postMessage("Resetting repeater.");
      repeaterPin.digitalWrite(0);
      setTimeout(() => repeaterPin.digitalWrite(1), 5000);
      break;

    case "REPEATER_LOW":
      repeaterPin.digitalWrite(0);
      ttsWorker.postMessage("Repeater pin pulled low.");
      break;

    case "REPEATER_HIGH":
      repeaterPin.digitalWrite(1);
      ttsWorker.postMessage("Repeater pin set high.");
      break;

    case "SILENCE!": // Acknowledge Alerts
      if (doorAlertActive || voltageAlertActive) {
        ttsWorker.postMessage("Alerts acknowledged.");
        logAlert("DTMF 'SILIENCE!' RECEIVED: ALERTS ACKNOWLEDGED");

        if (doorAlertTimer) {
          clearInterval(doorAlertTimer);
          doorAlertTimer = null;
        }
        if (voltageAlertTimer) {
          clearInterval(voltageAlertTimer);
          voltageAlertTimer = null;
        }

        doorAlertActive = false;
        voltageAlertActive = false;
      } else {
        ttsWorker.postMessage("No active alerts to acknowledge.");
      }
      break;

    default:
      console.log("Unknown or unsupported DTMF code");
  }
};

// Expose sensor data and test interface
app.get("/api/sensors", (req, res) => res.json(sensorData));
app.get("/api/test-speech", (req, res) => {
  ttsWorker.postMessage("Repeater system is online.");
  res.send("Test speech sent.");
});

// GET alert log
app.get("/api/alerts", (req, res) => {
  const logFile = path.join(__dirname, "alerts.log");
  fs.readFile(logFile, "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Unable to read alert log." });
    } else {
      res.json({ log: data });
    }
  });
});

app.post("/api/alerts/acknowledge", (req, res) => {
  // Send message to handle DTMF '4299' code (acknowledge alerts)
  this.handleDTMF("4299");

  res.json({ message: "Alerts acknowledged" });
});

// Serve Angular frontend (static)
app.use(express.static(path.join(__dirname, "public")));

const repeaterPin = new Gpio(25, { mode: Gpio.OUTPUT });

function logAlert(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFile(path.join(__dirname, "alerts.log"), line, (err) => {
    if (err) console.error("Failed to write to log:", err);
  });
}


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
