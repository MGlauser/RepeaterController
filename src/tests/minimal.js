import { Gpio } from 'pigpio'; // Import Gpio directly from the pigpio module

// *** IMPORTANT: Replace 17 with the BCM GPIO number you are using ***
const LED_PIN = 17;

const led = new Gpio(LED_PIN, { mode: Gpio.OUTPUT }); //

let level = 0; // Initial state (off)

console.log(`Attempting to toggle GPIO ${LED_PIN} every 500ms.`);
console.log('Press Ctrl+C to stop.');

const blinkInterval = setInterval(() => { // Using ES6 arrow function for conciseness
    level = level === 0 ? 1 : 0; // Toggle the level
    led.digitalWrite(level); // Write the new level to the GPIO pin
    console.log(`GPIO ${LED_PIN} is now ${level === 1 ? 'HIGH' : 'LOW'}`);
}, 500);

// Stop the blinking and free the GPIO resources after a few seconds
setTimeout(() => { // Using ES6 arrow function
    clearInterval(blinkInterval); // Stop the interval
    led.digitalWrite(0); // Ensure the LED is off
    led.mode(Gpio.INPUT); // Reset the GPIO pin to input mode
    console.log(`Stopped toggling GPIO ${LED_PIN}. GPIO reset to input mode.`);
}, 60000); // Stop after 10 seconds
