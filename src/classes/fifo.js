export class FifoQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false; // To prevent multiple concurrent processAll calls
  }

  /**
   * Adds an item to the end of the queue.
   * @param {*} item The item to add to the queue.
   */
  enqueue(item, processor) {
    this.queue.push(item);
    console.log(`Enqueued: ${JSON.stringify(item)}. Current queue size: ${this.queue.length}`);
    if (processor) {
      this.processAll(processor)
    }
  }

  /**
   * Processes all items in the queue asynchronously.
   * Each item is processed in order (FIFO).
   */
  async processAll(processor) {
    if (this.isProcessing) {
      console.log("Queue is already processing. Skipping new processAll call.");
      return;
    }

    this.isProcessing = true;
    console.log("Starting queue processing...");

    while (this.queue.length > 0) {
      const item = this.queue.shift(); // Remove the first item
      console.log(`Processing: ${JSON.stringify(item)}`);

      try {
        // Simulate an asynchronous task (e.g., API call, database operation)
        await processor(item.content);
        console.log(`Finished processing: ${JSON.stringify(item)}`);
      } catch (error) {
        console.error(`Error processing ${JSON.stringify(item)}: ${error}`);
      }
    }

    this.isProcessing = false;
    console.log("Finished queue processing.");
  }
}
