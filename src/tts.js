// tts.js
import { Gpio } from "pigpio";
import { execSync, spawn } from "child_process";
import { FifoQueue } from './classes/fifo.js'; // Import the new event queue class

const ttsQueue = new FifoQueue(); // Create an instance of the event queue.

const REPEATER_ID = "K7ID, controller";
let idTimer = null;
const txKey = new Gpio(22, { mode: Gpio.OUTPUT });
txKey.digitalWrite(1); // Start unkeyed

function getAlsaDeviceInfo(preferredName = 'AB13X USB Audio') {
  try {
    const output = execSync('aplay -l', { encoding: 'utf8' });
    const regex = new RegExp(`card (\\d+): (.+?)\\s+\\[${preferredName}\\], device (\\d+):`, 'i');
    const match = output.match(regex);
    if (match) {
      return { cardNum: match[1], cardName: match[2].trim(), devNum: match[3] };
    }
    const fallbackMatch = output.match(/card (\d+): (.+?), device (\d+):/);
    if (fallbackMatch) {
      return { cardNum: fallbackMatch[1], cardName: fallbackMatch[2].trim(), devNum: fallbackMatch[3] };
    }
  } catch (err) {
    console.error('Failed to list ALSA devices:', err);
  }
  return null;
}

const deviceInfo = getAlsaDeviceInfo('AB13X USB Audio');
if (!deviceInfo) {
  console.error('No ALSA device found.');
  process.exit(1);
}

const { cardName, devNum } = deviceInfo;
const audioCommand = `(Parameter.set 'Audio_Command "aplay -D plughw:CARD=\\\"${cardName}\\\",DEV=${devNum} -c 1 -t raw -f s16 -r 32000 $FILE")\n`;

// Only speak ID every 10 minutes.
async function sendID(extra = '.') {
  if (!idTimer) {
    // Instead of directly calling innerSpeak, enqueue the message
    ttsQueue.enqueue({ content: REPEATER_ID + extra });
    idTimer = setTimeout(async () => {
      console.log('10 minute timer completed.');
      idTimer = null;
    }, 1000 * 60 * 10); // 10 minutes
  }
}

export async function speak(text) {
  await sendID();
  // Enqueue the message when speak is called
  ttsQueue.enqueue({ content: text }, innerSpeak);
}

async function innerSpeak(message) {
  return new Promise((resolve, reject) => {
    const text = message;
    console.log(`innerSpeak text: ${text}`);
    if (!text) return resolve();
    try {
      console.log('PTT-ON');
      console.log(`Speaking: ${text}`);
      txKey.digitalWrite(0);

      const tts = spawn('festival', ['--pipe']);
      tts.stdin.write(audioCommand);
      tts.stdin.write(`(SayText "${text.replace(/"/g, '\\"')}")\n`);
      tts.stdin.end();

      tts.on('close', (code) => {
        txKey.digitalWrite(1);
        console.log('PTT-OFF');
        resolve(code === 0);
      });

      tts.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

