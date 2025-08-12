// tts.js
import { exec } from "child_process";

/**
 * Converts text to speech.
 * @param {string} text - The text to be spoken.
 * @param {string} [voice=undefined] - The voice to use (e.g., "Zarvox", "Karen"). If undefined, the default voice will be used.
 * @returns {Promise<void>} A Promise that resolves when the speech has finished.
 */
function speak(text, voice) {
  return new Promise((resolve, reject) => {
    let command = `say "${text}"`; // Basic command

    if (voice) {
      command += ` -v "${voice}"`; // Add voice option if specified
    }

    // You can also add an option to save to a file if needed:
    // const outputFile = `/tmp/speech-${Date.now()}.aiff`; 
    // command += ` -o "${outputFile}"`;

    exec(command, (error, stdout, stderr) => { // Use exec to run the command
      if (error) {
        console.error(`Error executing 'say' command: ${error.message}`);
        reject(error); // Reject the Promise on error
        return;
      }
      if (stderr) { // Check for stderr which may indicate warnings or errors
        console.warn(`'say' command stderr: ${stderr}`); // Log warnings or errors if necessary
      }
      console.log(`'say' command stdout: ${stdout}`); // Log output if necessary
      console.log(`Finished speaking: "${text}"`);
      resolve();
    });
  });
}

// Check if the script is being run directly from the command line
if (process.argv[1] === import.meta.filename) { // import.meta.filename is the ES Module equivalent of __filename
  const args = process.argv;
  if (args.length > 2) {
    // Check if a second argument (the text to speak) is provided
    const textToSpeak = args[2]; // Use the second argument as the text
    const voiceToUse = args[3]; // Optionally, use the third argument as the voice

    console.log(`Attempting to speak: "${textToSpeak}"`);
    speak(textToSpeak, voiceToUse)
      .then(() => console.log("Speech command completed."))
      .catch((err) => console.error("Error during speech command:", err));
  } else {
    console.log('Usage: node tts.js "Your text here" [Voice Name (optional)]');
    // To list available voices:
    exec('say -v ?', (error, stdout, stderr) => { // Directly execute 'say -v ?' to get voices
      if (error) {
        console.error("Error listing voices:", error);
        return;
      }
      console.log("Available voices:");
      console.log(stdout); 
    });
  }
}

export default speak; // Export the speak function for use as a module
