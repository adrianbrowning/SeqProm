/**
 * Advanced tests for SeqProm using Node.js native test runner
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import SeqProm from '../src/index';
import { mockFn, expect, timeExecution } from './test-utils';

describe('SeqProm Advanced Tests', async () => {
  // Type Safety Tests
  await it('should work with generic type parameters', async () => {
    return new Promise<void>((done) => {
      interface TestItem {
        id: number;
        value: string;
      }

      const items: TestItem[] = [
        { id: 1, value: 'one' },
        { id: 2, value: 'two' },
        { id: 3, value: 'three' }
      ];

      const cb = mockFn((item: TestItem, resolve) => {
        // Type checking ensures we can access TestItem properties
        resolve(item.id + item.value.length);
      });

      SeqProm<TestItem>({
        list: items,
        cb,
        finalCB(errors, responses) {
          expect(errors.length).toBe(0);
            expect(responses).toEqual([4, 5, 8]); // id + value.length
          done();
        }
      }).start();
    });
  });

  // Edge Cases
  await it('should handle empty lists', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn();
      const finalCB = mockFn((errors, responses) => {
        expect(errors.length).toBe(0);
        expect(responses.length).toBe(0);
        done();
      });

      SeqProm({
        list: [],
        cb,
        finalCB
      }).start();
    });
  });

  await it('should handle max batch/pool size equal to list length', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r) => r(i));

      SeqProm({
        list: [1, 2, 3],
        poolSize: 3, // Equal to list length
        cb,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(3);
          done();
        }
      }).start();
    });
  });

  // Error Handling Tests
  await it('should handle throwing callbacks', async () => {
    return new Promise<void>((done) => {
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        cb(item, resolve, _) {
          if (item === 2) {
            throw new Error('Intentional error');
          }
          resolve(item);
        },
        errorCB,
        finalCB(errors, responses) {
          expect(errorCB).toHaveBeenCalledTimes(1);
          expect(errors.length).toBe(1);
          expect(errors[0].reason).toEqual('Intentional error');
            expect(responses).toEqual([1, 3]);
          done();
        }
      }).start();
    });
  });

  await it('should validate required options', async () => {
    try {
      // @ts-expect-error Testing invalid options
      SeqProm({
        // Missing required 'list' property
        cb: () => {}
      });
      assert.fail('Should have thrown error for missing list');
    } catch (e) {
      assert.ok((e as Error).message.includes('list'));
    }

    try {
      // @ts-expect-error Testing invalid options
      SeqProm({
        list: [1, 2, 3]
        // Missing required 'cb' property
      });
      assert.fail('Should have thrown error for missing callback');
    } catch (e) {
      assert.ok((e as Error).message.includes('cb'));
    }
  });

  // Performance Tests
  await it('should perform efficiently with different batch sizes', async () => {
    const largeList = Array.from({ length: 100 }, (_, i) => i);

    // Small batch size
    const timeSmallBatch = await timeExecution(() => {
      return new Promise<void>((done) => {
        SeqProm({
          list: largeList,
          batchSize: 1,
          useBatch: true,
          cb(item, resolve) {
            setTimeout(() => resolve(item), 1);
          },
          finalCB() {
            done();
          }
        }).start();
      });
    });

    // Large batch size
    const timeLargeBatch = await timeExecution(() => {
      return new Promise<void>((done) => {
        SeqProm({
          list: largeList.slice(),
          batchSize: 20,
          useBatch: true,
          cb(item, resolve) {
            setTimeout(() => resolve(item), 1);
          },
          finalCB() {
            done();
          }
        }).start();
      });
    });

    console.log(`Small batch: ${timeSmallBatch}ms, Large batch: ${timeLargeBatch}ms`);
    // Large batch should be faster than small batch
    expect(timeLargeBatch).toBeLessThan(timeSmallBatch);
  });

  // Advanced Use Cases
  await it('should support chaining promises', async () => {
    return new Promise<void>((done) => {
      const results: number[] = [];

      SeqProm({
        list: [1, 2, 3],
        autoStart: true,
        cb(item, resolve) {
          resolve(item * 2);
        }
      }).promise
        .then(([_, responses]) => {
          results.push(...responses);
          return SeqProm({
            list: [4, 5, 6],
            autoStart: true,
            cb(item, resolve) {
              resolve(item * 2);
            }
          }).promise;
        })
        .then(([_, responses]) => {
          results.push(...responses);
          expect(results).toEqual([2, 4, 6, 8, 10, 12]);
          done();
        });
    });
  });

  await it('should support nested SeqProm instances', async () => {
    return new Promise<void>((done) => {
      const results: string[] = [];

      SeqProm({
        list: ['a', 'b', 'c'],
        cb(outerItem, resolve) {
          // Create a nested SeqProm for each item
          SeqProm({
            list: [1, 2],
            autoStart: true,
            cb(innerItem, innerResolve) {
              results.push(`${outerItem}${innerItem}`);
              innerResolve();
            },
            finalCB() {
              resolve(outerItem);
            }
          });
        },
        finalCB() {
          expect(results).toEqual(['a1', 'a2', 'b1', 'b2', 'c1', 'c2']);
          done();
        }
      }).start();
    });
  });
});

// Run the tests
console.log('Running SeqProm advanced tests with Node.js native test runner...');