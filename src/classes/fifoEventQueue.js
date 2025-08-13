// classes/fifo-event-queue.js
import { EventEmitter } from 'events'; // Import EventEmitter
import { FifoQueue } from './fifo.js'; // Assuming fifo.js is in the same directory

export class FifoEventQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = new FifoQueue();
    this.on('process-queue', this.processAllMessages); // Listen to the custom event
  }

  // Enqueue a message and emit the 'process-queue' event
  enqueueMessage(message) {
    console.log(`enqueueMessage got: ${JSON.stringify(message)}`)
    this.queue.enqueue(message);
    this.emit('process-queue'); // Trigger the processing
  }

  // Process all messages in the queue
  async processAllMessages() {
    // try/catch block for potential errors during queue processing
    try {
      while (!this.queue.isEmpty()) {
        await this.queue.processNext(async (message) => {
          console.log(`processing...: ${message}`);
          // No try/catch needed here, emitAsync handles errors internally
          await this.emitAsync('speak-message', message);
        });
      }
    } catch (error) {
      console.error('Error during queue processing:', error);
      // You might want to:
      // - Log the error more extensively
      // - Implement a retry mechanism for processNext or the entire loop
      // - Stop processing the queue
      // - Notify an administrator
    }
  }

  // Helper to emit and await an event, handling errors
  emitAsync(event, ...args) {
    console.log('in emitAsync()')
    return new Promise((resolve, reject) => {

      console.log('in emitAsync() Promise')
      this.emit(event, ...args, (err) => {
        console.log('in emitAsync() returned  from promise.')
        if (err) {
          console.error(err);
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }
}
