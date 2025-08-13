export class FifoQueue {
  constructor() {
    this.queue = [];
    this.processing = false; // Flag to ensure only one message is processed at a time
  }

  // Add a message to the end of the queue
  enqueue(message) {
    this.queue.push(message);
    this.processNext(); // Attempt to process if not already processing
  }

  // Process the next message in the queue
  async processNext(asyncCallback) {
    if (this.processing || this.queue.length === 0) {
      console.log(`processNext: processing ${this.processing}, length: ${this.queue.length}`);
      return; // Already processing or queue is empty
    }

    this.processing = true;
    const message = this.queue.shift(); // Get the first message
    this.processing = false;

    console.log(`Processing message .: ${message.content}`);

    await asyncCallback(message);

    console.log(`Finished processing: ${message.content}`);

    this.processing = false;
    // this.processNext(asyncCallback); // Process the next message if available
  }

  // Check if the queue is empty
  isEmpty() {
    return this.queue.length === 0;
  }
}
