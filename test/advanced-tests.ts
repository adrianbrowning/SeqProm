/**
 * Advanced tests for SeqProm using Node.js native test runner
 */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import SeqProm from '../src/index.ts';
import type {Func_CB, Func_ERR} from '../src/index.ts';
import {timeExecution, typeOf} from './test-utils.ts';

describe('SeqProm Advanced Tests', async () => {
  // Type Safety Tests
  await it('should work with generic type parameters', async () => {
    interface TestItem {
      id: number;
      value: string;
    }

    const items: TestItem[] = [
      { id: 1, value: 'one' },
      { id: 2, value: 'two' },
      { id: 3, value: 'three' }
    ];

    const cb = mock.fn((item: TestItem, {resolve}) => {
      // Type checking ensures we can access TestItem properties
      resolve(item.id + item.value.length);
    });

    const [errors, responses] = await SeqProm<number, TestItem>({
      list: items,
      cb,
      finalCB(errors, responses) {
        assert.strictEqual(errors.length, 0);
        assert.deepStrictEqual(responses.map(r => r.result), [4, 5, 8]); // id + value.length
      },
      autoStart: true
    }).promise;

    assert.strictEqual(errors.length, 0);
    assert.deepStrictEqual(responses.map(r => r.result), [4, 5, 8]); // id + value.length
  });

  // Edge Cases
  await it('should handle empty lists', async () => {
    const cb = mock.fn();
    const finalCB = mock.fn<(errors: any, items: any) => void>();

    const [errors, responses] = await SeqProm({
      list: [],
      cb,
      finalCB,
      autoStart: true
    }).promise;

    assert.strictEqual(finalCB.mock.calls.length, 1);
    assert.strictEqual(errors.length, 0);
    assert.strictEqual(responses.length, 0);
  });

  await it('should handle max batch/pool size equal to list length', async () => {
    const cb = mock.fn<Func_CB<number, number>>((i, {resolve}) => resolve(i));

    await SeqProm({
      list: [1, 2, 3],
      size: 3, // Equal to list length
      cb,
      finalCB() {
        assert.strictEqual(cb.mock.calls.length, 3);
      },
      autoStart: true
    }).promise;

    assert.strictEqual(cb.mock.calls.length, 3);
  });

  // Error Handling Tests
  await it('should handle throwing callbacks', async () => {
    const errorCB = mock.fn<Func_ERR<number>>();

    const [errors, responses] = await SeqProm({
      list: [1, 2, 3],
      cb(item, {resolve}) {
            if (item === 2) {
                throw new Error('Intentional error');
            }
            resolve(item);
      },
      errorCB,
      finalCB(errors, responses) {
        assert.strictEqual(errorCB.mock.calls.length, 1);
        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].item, 2);
        assert.strictEqual(typeOf(errors[0].reason), "string");
        assert.strictEqual(errors[0].reason , 'Intentional error');
        assert.deepStrictEqual(responses.map(r => r.result), [1, 3]);
      },
      autoStart: true
    }).promise;

    assert.strictEqual(errorCB.mock.calls.length, 1);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].item, 2);
    assert.strictEqual(responses.length, 2);
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
    const timeSmallBatch = await timeExecution(async () => {
      await SeqProm({
        list: largeList,
        size: 1,
        useBatch: true,
        cb(item, {resolve}) {
          setTimeout(() => resolve(item), 1);
        },
        autoStart: true
      }).promise;
    });

    // Large batch size
    const timeLargeBatch = await timeExecution(async () => {
      await SeqProm({
        list: largeList.slice(),
        size: 20,
        useBatch: true,
        cb(item, {resolve}) {
          setTimeout(() => resolve(item), 1);
        },
        autoStart: true
      }).promise;
    });

    console.log(`Small batch: ${timeSmallBatch}ms, Large batch: ${timeLargeBatch}ms`);
    // Large batch should be faster than small batch
    assert.ok(timeLargeBatch < timeSmallBatch, `Expected large batch (${timeLargeBatch}ms) to be faster than small batch (${timeSmallBatch}ms)`);
  });

  // Advanced Use Cases
  await it('should support chaining promises', async () => {
    const results: Array<{item: number, result: number}> = [];

    // First promise chain
    const [_, firstResponses] = await SeqProm({
      list: [1, 2, 3],
      autoStart: true,
      cb(item) {
        return item * 2;
      }
    }).promise;

    results.push(...firstResponses);

    // Second promise chain
    const [__, secondResponses] = await SeqProm<number, number>({
      list: [4, 5, 6],
      autoStart: true,
      cb(item, {resolve}) {
        resolve(item * 2);
      }
    }).promise;

    results.push(...secondResponses);

    assert.deepStrictEqual(results.map(r => r.result), [2, 4, 6, 8, 10, 12]);
  });

  await it('should support nested SeqProm instances', async () => {
    const results: string[] = [];

    const [_, responses] = await SeqProm({
      list: ['a', 'b', 'c'],
      cb(outerItem, {resolve}) {
        // Create a nested SeqProm for each item
        return SeqProm({
          list: [1, 2],
          autoStart: true,
          cb(innerItem, {resolve: innerResolve}) {
            results.push(`${outerItem}${innerItem}`);
            innerResolve(`innerItem > ${innerItem}`);
          },
          finalCB() {
            resolve(outerItem);
          }
        }).promise;
      },
      finalCB(_, responses) {
        assert.deepStrictEqual(results, ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']);
        assert.deepStrictEqual(responses.map(r => r.item), ['a', 'b', 'c']);
      }
    }).start().promise;

    assert.deepStrictEqual(results, ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']);
    assert.deepStrictEqual(responses.map(r => r.item), ['a', 'b', 'c']);
  });
});

// Run the tests
console.log('Running SeqProm advanced tests with Node.js native test runner...');