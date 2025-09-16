/**
 * SeqProm tests using Node.js native test runner
 */
import { describe, it } from 'node:test';
import SeqProm from '../src/index.ts';
import { mockFn, expect } from './test-utils.ts';

describe('SeqProm Basic Tests', async () => {
  await it('All items resolve - List', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r) => r(i));
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        cb,
        errorCB,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(3);
          expect(errorCB).toHaveBeenCalledTimes(0);
          done();
        },
      }).start();
    });
  });

  await it('All items resolve - Batch', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r) => setTimeout(() => r(i), i));
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        batchSize: 3,
        useBatch: true,
        cb,
        errorCB,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(9);
          expect(errorCB).toHaveBeenCalledTimes(0);
          done();
        }
      }).start();
    });
  });

  await it('All items resolve - Streaming', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r) => setTimeout(() => r(i), i));
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        poolSize: 3,
        cb,
        errorCB,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(15);
          expect(errorCB).toHaveBeenCalledTimes(0);
          done();
        },
      }).start();
    });
  });

  await it('One item fail resolve', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r, re) =>
        setTimeout(() => {
          if (i === 3) {
            re("Too Big");
          } else {
            r(i);
          }
        }, i)
      );

      const errorCB = mockFn((i, msg) => {
        expect(i).toEqual(3);
        expect(msg).toEqual('Too Big');
      });

      SeqProm({
        list: [1, 2, 3],
        cb,
        errorCB,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(3);
          expect(errorCB).toHaveBeenCalledTimes(1);
          done();
        },
      }).start();
    });
  });

  await it('Stop before complete - list', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r, _, self) => {
        setTimeout(() => r(i), i);
        self?.stop();
      });

      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        cb,
        errorCB,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(1);
          expect(errorCB).toHaveBeenCalledTimes(0);
          done();
        },
      }).start();
    });
  });

  await it('Stop before complete - batch', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r, _, self) => {
        setTimeout(() => r(i), i);
        self?.stop();
      });

      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        batchSize: 3,
        useBatch: true,
        cb,
        errorCB,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(3);
          expect(errorCB).toHaveBeenCalledTimes(0);
          done();
        },
      }).start();
    });
  });

  await it('Stop before complete - stream', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r, _, self) => {
        setTimeout(() => r(i), i);
        self?.stop();
      });

      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 1, 2, 3, 1, 2, 3],
        poolSize: 3,
        cb,
        errorCB,
        finalCB() {
          expect(cb).toHaveBeenCalledTimes(1);
          expect(errorCB).toHaveBeenCalledTimes(0);
          done();
        },
      }).start();
    });
  });

  await it('Data pass through - list', async () => {
    return new Promise<void>((done) => {
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        cb(item, resolve, reject) {
          setTimeout(() => {
            if (item % 2) return resolve(item);
            return reject(item);
          }, item);
        },
        errorCB,
        finalCB(errors, responses) {
          expect(errorCB).toHaveBeenCalledTimes(1);
          expect(errors.length).toBe(1);
          expect(responses.length).toBe(2);
          done();
        },
      }).start();
    });
  });

  await it('Data pass through - batch', async () => {
    return new Promise<void>((done) => {
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 1, 2, 3, 1, 2, 3],
        batchSize: 3,
        useBatch: true,
        cb(item, resolve, reject) {
          setTimeout(() => {
            if (item % 3) return resolve(item);
            return reject(item);
          }, item);
        },
        errorCB,
        finalCB(errors, responses) {
          expect(errorCB).toHaveBeenCalledTimes(3);
          expect(errors.length).toBe(3);
          expect(responses.length).toBe(6);
          done();
        },
      }).start();
    });
  });

  await it('Data pass through - streaming', async () => {
    return new Promise<void>((done) => {
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        poolSize: 3,
        cb(item, resolve, reject) {
          setTimeout(() => {
            if (item % 3) return resolve(item);
            return reject(item);
          }, item);
        },
        errorCB,
        finalCB(errors, responses) {
          expect(errorCB).toHaveBeenCalledTimes(5);
          expect(errors.length).toBe(5);
          expect(responses.length).toBe(10);
          done();
        },
      }).start();
    });
  });

  await it('Auto Start', async () => {
    return new Promise<void>((done) => {
      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        autoStart: true,
        cb(item, resolve, reject) {
          setTimeout(() => {
            if (item % 2) return resolve(item);
            return reject(item);
          }, item);
        },
        errorCB,
        finalCB(errors, responses) {
          expect(errorCB).toHaveBeenCalledTimes(1);
          expect(errors.length).toBe(1);
          expect(responses.length).toBe(2);
          done();
        },
      });
    });
  });

  await it('No Callbacks', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((item, resolve, reject) => {
        setTimeout(() => {
          if (item % 2) return resolve(item);
          return reject(item);
        }, item);
      });

      SeqProm({
        list: [1, 2, 3],
        autoStart: true,
        cb,
      }).promise.then(_ => {
        expect(cb).toHaveBeenCalledTimes(3);
        done();
      });
    });
  });

  await it('Return promise - List', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r) => setTimeout(() => r(i), i));
      const errorCB = mockFn();
      const finalCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        cb,
        errorCB,
        finalCB,
      }).start().promise.then(_ => {
        expect(cb).toHaveBeenCalledTimes(3);
        expect(errorCB).toHaveBeenCalledTimes(0);
        expect(finalCB).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  await it('Return promise - Batch', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r) => setTimeout(() => r(i), i));
      const errorCB = mockFn();
      const finalCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3],
        batchSize: 3,
        useBatch: true,
        cb,
        errorCB,
        finalCB,
      }).start().promise.then(_ => {
        expect(cb).toHaveBeenCalledTimes(12);
        expect(errorCB).toHaveBeenCalledTimes(0);
        expect(finalCB).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  await it('Return promise - Streaming', async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r) => setTimeout(() => r(i), i));
      const errorCB = mockFn();
      const finalCB = mockFn();

      SeqProm({
        list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        poolSize: 3,
        cb,
        errorCB,
        finalCB,
      }).start().promise.then(_ => {
        expect(cb).toHaveBeenCalledTimes(15);
        expect(errorCB).toHaveBeenCalledTimes(0);
        expect(finalCB).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  await it("Final Callback error & responses list", async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r, re) => {
        setTimeout(() => i !== 3 ? r(i): re(i), i);
      });

      const errorCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        autoStart: true,
        cb,
        errorCB,
        finalCB(errors, responses) {
          expect(cb).toHaveBeenCalledTimes(3);
          expect(errorCB).toHaveBeenCalledTimes(1);
          expect(errors.length).toBe(1);
          expect(responses.length).toBe(2);
          expect(errors).arrayContaining([{
            item: 3,
            reason: 3
          }]);
          expect(responses).arrayContaining([1, 2]);
          done();
        }
      });
    });
  });

  await it("Chained Then Callback error & responses list", async () => {
    return new Promise<void>((done) => {
      const cb = mockFn((i, r, re) => {
        setTimeout(() => i !== 3 ? r(i): re(i), i);
      });

      const errorCB = mockFn();
      const finalCB = mockFn();

      SeqProm({
        list: [1, 2, 3],
        autoStart: true,
        cb,
        errorCB,
        finalCB,
      })
        .promise
        .then(([errors, responses]) => {
          expect(cb).toHaveBeenCalledTimes(3);
          expect(errorCB).toHaveBeenCalledTimes(1);
          expect(finalCB).toHaveBeenCalledTimes(1);
          expect(errors.length).toBe(1);
          expect(responses.length).toBe(2);
          expect(errors).arrayContaining([{
            item: 3,
            reason: 3
          }]);
          expect(responses).arrayContaining([1, 2]);
          done();
        });
    });
  });

  await it("Run 2 at once", async () => {
    return new Promise<void>((done) => {
      let doneCount = 0;
      const checkDone = () => {
        doneCount++;
        if (doneCount === 2) done();
      };

      const error1 = mockFn();
      const callBack1 = mockFn((i, r) => {
        expect(i).toBe(1);
        r();
      });

      const error2 = mockFn();
      const callBack2 = mockFn((i, r) => {
        expect(i).toBe(2);
        r();
      });

      SeqProm({
        list: [1, 1, 1],
        cb: callBack1,
        errorCB: error1,
        autoStart: true,
        finalCB() {
          try {
            expect(callBack1).toHaveBeenCalledTimes(3);
            expect(error1).toHaveBeenCalledTimes(0);
            checkDone();
          }
          catch (e) {
            done();
          }
        },
      });

      SeqProm({
        list: [2, 2, 2],
        cb: callBack2,
        errorCB: error2,
        autoStart: true,
        finalCB() {
          try {
            expect(callBack2).toHaveBeenCalledTimes(3);
            expect(error2).toHaveBeenCalledTimes(0);
            checkDone();
          }
          catch (e) {
            done();
          }
        },
      });
    });
  });
});

// Run the tests
console.log('Running SeqProm tests with Node.js native test runner...');