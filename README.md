# SeqProm
Type-safe promise processing for arrays in TypeScript/JavaScript

## Installation

```bash
npm install seq-prom --save
```
```bash
pnpm add seq-prom
```


## Options

| Option | Type | Description | Default | Required? |
|-----------|----------|--------------------------------------------------------------------------------------------------|---------|-----------|
| list | Array<T> | List of items to iterate through |  | Yes |
| cb | Function | Type-safe callback function for processing each item |  | Yes |
| size | Integer | Size of the batch or pool (number of concurrent operations) | 1 | No |
| errorCB | Function | Called when there is an error, with the item and reason for error |  | No |
| finalCB | Function | Called when all is done. Passes in a list of errors, and any items, passed to the resolve method |  | No |
| useBatch | Boolean | Process items in batches of size `size` | false | No |
| autoStart | Boolean | Instead of having to call .start() will do this for you | false | No |

## Core Concepts

### Processing Modes

SeqProm supports two processing modes for handling collections of items:

### Pool Mode (Default)

In pool mode, SeqProm creates a "pool" of concurrent promises, processing items as previous ones complete. This is ideal for handling a large number of items with controlled concurrency.

- Set `poolSize` to control how many items process concurrently
- Items start processing immediately up to the pool size limit
- As each item completes, the next waiting item begins processing
- Order of completion depends on how long each item takes to process

### Batch Mode

In batch mode, SeqProm processes items in discrete batches of a specific size. Each batch completes fully before the next batch begins.

- Set `useBatch: true` and `size` to define batch size
- Items are processed in sequential batches
- All items in a batch are processed concurrently
- The next batch only starts after the current batch fully completes
- Useful for operations that should happen in specific groups

## Usage Examples

### Basic Usage

#### Using Direct Return Values (Simplest)

```typescript
import SeqProm from "seq-prom";

// Simply return a value from the callback
SeqProm({
  list: [1, 2, 3],
  autoStart: true,
  cb(item) {
    console.log(`Processing ${item}`);
    return `Result: ${item * 2}`;
  },
  finalCB(errors, responses) {
    console.log("All done!", responses);
  }
});
```

#### Using Async/Await

```typescript
import SeqProm from "seq-prom";

// Asynchronous callback with async/await
SeqProm({
  list: [1, 2, 3],
  autoStart: true,
  cb: async (item) => {
    console.log(`Processing ${item}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return `Processed ${item}`;
  },
  finalCB(errors, responses) {
    console.log("All results:", responses.map(r => r.result));
  }
});
```

#### Using Resolve/Reject Functions

```typescript
import SeqProm from "seq-prom";

// Using explicit resolve/reject callbacks
// Type parameters are needed for this style
let seqProm = SeqProm<number, void>({
  list: [1, 2, 3],
  cb(item, {resolve, reject}) {
    console.log(`Item [${item}] called!`);
    setTimeout(function () {
      if (item === 3) {
        return reject("Not sure about this!");
      } else {
        return resolve();
      }
    }, item * 1000);
  },
  errorCB(item, reason) {
    console.error(`Item [${item}] failed with error: ${reason}`);
  },
  finalCB() {
    console.log("All done!");
  }
});

seqProm.start();
```
    
### Processing Mode Examples

#### Pool Mode

```typescript
import SeqProm from "seq-prom";

// Processing with a pool of 2 concurrent operations using async/await
SeqProm({
  list: [1, 2, 3, 4],
  autoStart: true,
  size: 2,  // 2 concurrent operations at a time
  cb: async (item) => {
    console.log(`Processing item ${item}`);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, item * 200));
    
    // If item is 3, throw an error (will be caught internally)
    if (item === 3) {
      throw new Error("Processing error");
    }
    
    return `Result: ${item * 10}`;
  },
  errorCB(item, reason) {
    console.error(`Item [${item}] failed with error: ${reason}`);
  },
  finalCB(errors, responses) {
    console.log("All items processed!");
    console.log(`Successful: ${responses.length}, Failed: ${errors.length}`);
    
    // Print successful results
    responses.forEach(res => {
      console.log(`Item ${res.item} → ${res.result}`);
    });
  }
});

// Use the promise for further actions
const [errors, responses] = await SeqProm({
  list: [5, 6, 7],
  size: 2,
  cb: async (num) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return num * 2;
  }
}).start().promise;

console.log("All processing complete:", responses.map(r => r.result));
```

#### Batch Mode

```typescript
import SeqProm from "seq-prom";

// Processing in batches using async/await
SeqProm({
  list: [1, 2, 3, 4, 5, 6],
  autoStart: true,
  useBatch: true,  // Enable batch processing mode
  size: 2,         // Process items in batches of 2
  
  // Using async callback
  cb: async (item) => {
    console.log(`Batch processing item ${item}`);
    
    try {
      // Simulate database operation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Each batch waits for all its items to complete before starting the next batch
      return {
        processed: true,
        value: item * 10,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Error handling with async/await
      console.error(`Error processing item ${item}:`, error);
      throw error; // Re-throw to trigger error handling in SeqProm
    }
  },
  finalCB(errors, responses) {
    console.log(`Processed ${responses.length} items in ${Math.ceil(responses.length/2)} batches`);
    
    // Group responses by batch (for demonstration purposes)
    const batches = [];
    for (let i = 0; i < responses.length; i += 2) {
      batches.push(responses.slice(i, i + 2));
    }
    
    // Show each batch's results
    batches.forEach((batch, i) => {
      console.log(`Batch ${i+1} results:`);
      batch.forEach(res => {
        console.log(`- Item ${res.item} → ${res.result.value} at ${res.result.timestamp}`);
      });
    });
  }
});
```

> **Note**: In batch mode, all items in a batch are processed concurrently, but the next batch only starts after the current batch completely finishes processing.

   

## Functions

### cb

| Argument | Description                                      |
|----------|--------------------------------------------------|
| item     | Item from the list (type T)                      |
| extra    | Object containing resolve, reject, and self      |
| extra.resolve | The resolve function (accepts value of type RT)  |
| extra.reject  | The reject function for error handling          |
| extra.self    | Reference to the SeqProm instance (can call `.stop()`) |

### errorCB

| Argument | Description                                                           |
|----------|-----------------------------------------------------------------------|
| item     | Item from the list                                                    |
| reason   | Reason for the error, either from the reject method or a caught error |

### finalCB

| Argument  | Description                                       |
|-----------|---------------------------------------------------|
| error     | List of errors that have occured                  |
| response  | List of items passed back to the resolve function |
      
### Promise Handling

```typescript
import SeqProm from "seq-prom";

// Using the promise directly with typed response
SeqProm<number, string>({
  list: [1, 2, 3],
  autoStart: true,
  cb(item, {resolve, reject}) {
    console.log(`Item [${item}] called!`);
    setTimeout(function () {
      if (item === 3) {
        return reject("Too large");
      } else {
        // Converting numbers to strings as our return type is string
        return resolve(`Value: ${item}`);
      }
    }, item * 1000);
  }
})
.promise
.then(([errors, responses]) => {
  // errors: Array<{item: number, reason: string | Error}>
  // responses: Array<{item: number, result: string}>
  console.log(errors, responses);
  
  // You can access the successful results
  responses.forEach(response => {
    console.log(`Item ${response.item} resulted in: ${response.result}`);
  });
});
```         

## Type System

### Generic Type Parameters

SeqProm is fully type-safe and supports generic type parameters for both input items and return values.

SeqProm takes two type parameters:

```typescript
SeqProm<ReturnType, ItemType>({ ... })
```

- `ReturnType` - The type of value returned by your callback function
- `ItemType` - The type of items in your input list

### Example with Complex Types

```typescript
// Define custom types
interface User {
  id: number;
  name: string;
}

interface ProcessedUser {
  id: number;
  displayName: string;
  lastProcessed: Date;
}

// Using SeqProm with complex types
const users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" }
];

SeqProm<ProcessedUser, User>({
  list: users,
  size: 2,  // Process 2 users concurrently
  cb(user, {resolve}) {
    // Transform User to ProcessedUser
    const processed: ProcessedUser = {
      id: user.id,
      displayName: user.name.toUpperCase(),
      lastProcessed: new Date()
    };
    resolve(processed);
  },
  finalCB(errors, processedUsers) {
    // processedUsers is typed as Array<{item: User, result: ProcessedUser}>
    processedUsers.forEach(item => {
      console.log(
        `User ${item.item.name} processed as ${item.result.displayName} at ${item.result.lastProcessed}`
      );
    });
  }
}).start();
```

### Callback Styles

#### Direct Return Value Style

```typescript
// Simply return a value from the callback
SeqProm({
  list: ['apple', 'banana', 'cherry'],
  cb(item) {
    // Return directly - SeqProm handles this automatically
    return item.toUpperCase();
  }
});
```

#### Async/Await Style

```typescript
// Using async/await for clean asynchronous code
SeqProm({
  list: [1, 2, 3],
  cb: async (item) => {
    // Use await for any async operations
    const result = await someAsyncOperation(item);
    return result;
  }
});

// Helper function
async function someAsyncOperation(value: number): Promise<string> {
  return new Promise(resolve => {
    setTimeout(() => resolve(`Processed ${value}`), 100);
  });
}
```

#### Promise Chain Style

```typescript
// Returning a Promise directly
SeqProm({
  list: [1, 2, 3],
  cb(item) {
    return new Promise<string>(resolve => {
      setTimeout(() => resolve(`Number: ${item}`), 100);
    });
  }
});
```

#### Resolve/Reject Style (Traditional)

```typescript
// Using the provided resolve/reject functions
SeqProm<string, number>({
  list: [1, 2, 3],
  cb(item, {resolve, reject}) {
    if (item > 2) {
      reject('Value too large');
    } else {
      resolve(`Number: ${item}`);
    }
  }
});
```

### Advanced Examples with Complex Types

#### Working with Complex Promise Chains

```typescript
// Define our response type structure
interface ApiResponse<T> {
  data: T;
  timestamp: number;
  success: boolean;
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

// Process a list of user IDs with complex Promise handling
SeqProm<ApiResponse<UserData>, number>({
  list: [101, 102, 103],
  size: 2, // Process 2 at a time
  cb(userId) {
    // Return a typed Promise chain
    return fetchUserById(userId)
      .then(userData => {
        // Transform the data into our ApiResponse format
        return {
          data: userData,
          timestamp: Date.now(),
          success: true
        };
      })
      .catch(error => {
        // Handle errors in the Promise chain
        console.error(`Failed to fetch user ${userId}:`, error);
        throw new Error(`User fetch failed: ${error.message}`);
      });
  },
  finalCB(errors, responses) {
    // Type-safe access to the complex response structure
    responses.forEach(res => {
      const userData = res.result.data;
      console.log(
        `User ${userData.name} (${userData.email}) fetched at ${new Date(res.result.timestamp).toLocaleString()}`
      );
    });
  }
});

// Mock API function
function fetchUserById(id: number): Promise<UserData> {
  return new Promise((resolve, reject) => {
    // Simulate API call
    setTimeout(() => {
      if (id === 102) {
        reject(new Error("User not found"));
        return;
      }
      
      resolve({
        id,
        name: `User ${id}`,
        email: `user${id}@example.com`
      });
    }, 200);
  });
}
```

## Tests

```bash
npm test
```

## Release History

* 3.0.0 ReadMe update
* 3.0.0 TypeScript update
    * Full TypeScript rewrite with generic type support
    * Enhanced error handling and promise support
    * Renamed parameters for clarity (batchSize -> size, useStream -> useBatch)
    * Improved test coverage and fixed Promise resolution issues
    * Support for direct return values, Promises, and resolve/reject callbacks
* 1.1.1 Package update
* 1.1.0 
    * Updates to allow passage of data
    * Added more tests 	
    * Added autStart option
    * Added ability to chain off of promise
* 1.0.0 Initial release