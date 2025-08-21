# FifoQueue Class

The `FifoQueue` class implements a First-In-First-Out (FIFO) queue with asynchronous processing capabilities.

## Constructor

### `constructor()`

Initializes an instance of the `FifoQueue` class.

#### Properties

- `queue`: An array that stores the items in the queue.
- `isProcessing`: A boolean flag to prevent multiple concurrent `processAll` calls.

## Methods

### `enqueue(item, processor)`

Adds an item to the end of the queue and optionally starts processing all queued items using the provided processor function.

#### Parameters

- `item` (`*`): The item to add to the queue.
- `processor` (`Function`, optional): A function that processes the item. If provided, the `processAll` method is called with this processor.

### `processAll(processor)`

Processes all items in the queue asynchronously. Each item is processed in order (FIFO).

#### Parameters

- `processor` (`Function`): A function that takes an item's content and processes it asynchronously.

#### Behavior

1. If processing is already in progress, this method returns immediately.
2. Sets the `isProcessing` flag to true to prevent concurrent processing.
3. Processes each item in the queue:
   - Removes items one by one from the front of the queue.
   - Calls the processor function with the item's content.
   - Handles any errors that occur during processing.
4. Resets the `isProcessing` flag after all items have been processed.

## Usage Example

```javascript
const myQueue = new FifoQueue();

// Add an item to the queue and process it immediately
myQueue.enqueue({ content: 'Item 1' }, async (content) => {
  // Simulate asynchronous processing, e.g., API call or database operation
  console.log(`Processing content: ${content}`);
});

// Add another item without immediate processing
myQueue.enqueue({ content: 'Item 2' });
```

## Notes

- The class includes commented-out `console.log` statements that can be used for debugging.
- The processor function should accept a single parameter representing the content of each queue item.
