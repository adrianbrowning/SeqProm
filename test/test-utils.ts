/**
 * Test utilities for Node.js native testing
 */
import assert from 'node:assert';

/**
 * Creates a mock function with call tracking
 */
export function mockFn<T extends (...args: any[]) => any>(impl?: T): T & { mock: { calls: any[][] }, mockReset: () => void } {
  const calls: any[][] = [];
  
  const fn = impl ? 
    ((...args: any[]) => {
      calls.push(args);
      return impl(...args);
    }) : 
    ((...args: any[]) => {
      calls.push(args);
      return undefined;
    });

  (fn as any).mock = { calls };
  (fn as any).mockReset = () => { calls.length = 0; };
  
  return fn as any;
}

/**
 * Jest-like expect API built on Node.js assert
 */
export function expect<T>(actual: T) {
  return {
    toBe: (expected: T) => 
      assert.strictEqual(actual, expected),
      
    toEqual: (expected: T) => 
      assert.deepStrictEqual(actual, expected),
      
    toHaveBeenCalledTimes: (times: number) => {
      const mock = actual as unknown as { mock: { calls: any[][] } };
      assert.strictEqual(mock.mock.calls.length, times, 
        `Expected mock to be called ${times} times, but was called ${mock.mock.calls.length} times`);
    },
    
    toBeTruthy: () => 
      assert.ok(actual, `Expected ${actual} to be truthy`),
      
    toBeFalsy: () => 
      assert.ok(!actual, `Expected ${actual} to be falsy`),
      
    toBeGreaterThan: (expected: number) => 
      assert.ok((actual as unknown as number) > expected, 
        `Expected ${actual} to be greater than ${expected}`),
        
    toBeLessThan: (expected: number) => 
      assert.ok((actual as unknown as number) < expected, 
        `Expected ${actual} to be less than ${expected}`),
        
    toContain: (item: any) => 
      assert.ok((actual as unknown as any[]).includes(item), 
        `Expected array to contain ${item}`),
        
    toHaveLength: (length: number) => 
      assert.strictEqual((actual as unknown as any[]).length, length, 
        `Expected array to have length ${length}`),
        
    toMatchObject: (obj: Record<string, any>) => 
      assert.ok(Object.entries(obj).every(([key, value]) => 
        (actual as unknown as Record<string, any>)[key] === value), 
        `Expected object to match ${JSON.stringify(obj)}`),
        
    toThrow: (error?: string | RegExp | Error) => {
      try {
        (actual as unknown as Function)();
        assert.fail('Expected function to throw');
      } catch (e) {
        if (!error) return;
        if (typeof error === 'string') {
          assert.ok((e as Error).message.includes(error), 
            `Expected error message to include "${error}"`);
        } else if (error instanceof RegExp) {
          assert.ok(error.test((e as Error).message), 
            `Expected error message to match ${error}`);
        } else {
          assert.deepStrictEqual(e, error);
        }
      }
    },
    
    arrayContaining: (expected: any[]) => {
      const actualArray = actual as unknown as any[];
      expected.forEach(item => {
        const matchItem = actualArray.some(actualItem => 
          JSON.stringify(actualItem) === JSON.stringify(item)
        );
        assert.ok(matchItem, `Expected array to contain ${JSON.stringify(item)}`);
      });
    }
  };
}

/**
 * Helper for timing the execution of async functions
 */
export async function timeExecution(fn: () => Promise<any>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

/**
 * Creates a deferred promise that can be resolved or rejected externally
 */
export function createDeferred<T = any>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: any) => void = () => {};
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}