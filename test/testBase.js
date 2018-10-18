/**
 * Created by adrianbrowning on 01/12/2016.
 */
module.exports = (SeqProm) => {
  
  test('All items resolve - List', function (done) {
    const cb = jest.fn((i, r) => r(i)), errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3 ],
      cb,
      errorCB,
      finalCB() {
        expect(cb).toHaveBeenCalledTimes(3);
        expect(errorCB).toHaveBeenCalledTimes(0);
        return done();
      },
    }).start();
  });
  
  test('All items resolve - Batch', function (done) {
    const cb = jest.fn((i, r) => setTimeout(() => r(i), i)), errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
      batchSize: 3,
      cb,
      errorCB,
      finalCB() {
        expect(cb).toHaveBeenCalledTimes(9);
        expect(errorCB).toHaveBeenCalledTimes(0);
        return done();
      }
    }).start();
  });
  
  test('All items resolve - Streaming', function (done) {
    const cb = jest.fn((i, r) => setTimeout(() => r(i), i)), errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ],
      poolSize: 3,
      cb,
      errorCB,
      finalCB() {
        expect(cb).toHaveBeenCalledTimes(15);
        expect(errorCB).toHaveBeenCalledTimes(0);
        return done();
      },
    }).start();
  });
  
  test('One item fail resolve', function (done) {
    const cb = jest.fn((i, r, re) => setTimeout(() => {if (i === 3) {re("Too Big")} else {r(i)}}, i)), errorCB = jest.fn((i, msg) => {
      expect(i).toEqual(3);
      expect(msg).toEqual('Too Big')
    });
    SeqProm({
      list: [ 1, 2, 3 ],
      cb,
      errorCB,
      finalCB() {
        expect(cb).toHaveBeenCalledTimes(3);
        expect(errorCB).toHaveBeenCalledTimes(1);
        return done();
      },
    }).start();
  });
  
  test('Stop before complete - list', function (done) {
    const cb    = jest.fn((i, r, re, self) => {
      setTimeout(() => r(i), i);
      self.stop()
    }), errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3 ],
      cb,
      errorCB,
      finalCB() {
        expect(cb).toHaveBeenCalledTimes(1);
        expect(errorCB).toHaveBeenCalledTimes(0);
        return done();
      },
    }).start();
  });
  
  test('Stop before complete - batch', function (done) {
    const cb    = jest.fn((i, r, re, self) => {
      setTimeout(() => r(i), i);
      self.stop()
    }), errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
      batchSize: 3,
      useBatch: true,
      cb,
      errorCB,
      finalCB() {
        expect(cb).toHaveBeenCalledTimes(3);
        expect(errorCB).toHaveBeenCalledTimes(0);
        return done();
      },
    }).start();
  });
  
  test('Stop before complete - stream', function (done) {
    const cb    = jest.fn((i, r, re, self) => {
      setTimeout(() => r(i), i);
      self.stop()
    }), errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 1, 2, 3, 1, 2, 3 ],
      poolSize: 3,
      cb,
      errorCB,
      finalCB() {
        expect(cb).toHaveBeenCalledTimes(1);
        expect(errorCB).toHaveBeenCalledTimes(0);
        return done();
      },
    }).start();
  });
  
  test('Data pass through - list', function (done) {
    const errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3 ],
      cb(item, resolve, reject) {
        setTimeout(function () {
          if (item % 2) return resolve(item);
          return reject(item);
        }, item);
      },
      errorCB,
      finalCB(errors, responses) {
        expect(errorCB).toHaveBeenCalledTimes(1);
        expect(errors.length).toBe(1);
        expect(responses.length).toBe(2);
        return done();
      },
    }).start();
  });
  
  test('Data pass through - batch', function (done) {
    const errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 1, 2, 3, 1, 2, 3 ],
      batchSize: 3,
      useBatch: true,
      cb(item, resolve, reject) {
        setTimeout(function () {
          if (item % 3) return resolve(item);
          return reject(item);
        }, item);
      },
      errorCB,
      finalCB(errors, responses) {
        expect(errorCB).toHaveBeenCalledTimes(3);
        expect(errors.length).toBe(3);
        expect(responses.length).toBe(6);
        return done();
      },
    }).start();
  });
  
  test('Data pass through - streaming', function (done) {
    const errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ],
      poolSize: 3,
      cb(item, resolve, reject) {
        
        setTimeout(function () {
          if (item % 3) return resolve(item);
          return reject(item);
        }, item);
        
      },
      errorCB,
      finalCB(errors, responses) {
        expect(errorCB).toHaveBeenCalledTimes(5);
        expect(errors.length).toBe(5);
        expect(responses.length).toBe(10);
        return done();
      },
    }).start();
  });
  
  test('Auto Start', function (done) {
    const errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3 ],
      autoStart: true,
      cb(item, resolve, reject) {
        setTimeout(function () {
          if (item % 2) return resolve(item);
          return reject(item);
        }, item);
      },
      errorCB,
      finalCB(errors, responses) {
        expect(errorCB).toHaveBeenCalledTimes(1);
        expect(errors.length).toBe(1);
        expect(responses.length).toBe(2);
        return done();
      },
    });
  });
  
  test('No Callbacks', function (done) {
    const cb = jest.fn((item, resolve, reject) => {
      setTimeout(function () {
        if (item % 2) return resolve(item);
        return reject(item);
      }, item);
    });
    SeqProm({
      list: [ 1, 2, 3 ],
      autoStart: true,
      cb,
    }).promise.then(_ => {
      expect(cb).toHaveBeenCalledTimes(3);
      return done();
    });
  });
  
  test('Return promise - List', function (done) {
    const cb      = jest.fn((i, r, re, self) => {setTimeout(() => r(i), i)}),
          errorCB = jest.fn(),
          finalCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3 ],
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
  
  test('Return promise - Batch', function (done) {
    const cb      = jest.fn((i, r, re, self) => {setTimeout(() => r(i), i)}),
          errorCB = jest.fn(),
          finalCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3 ],
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
  
  test('Return promise - Streaming', function (done) {
    const cb      = jest.fn((i, r, re, self) => {setTimeout(() => r(i), i)}),
          errorCB = jest.fn(),
          finalCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ],
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
  
  test("Final Callback error & responses list", function (done) {
    const cb      = jest.fn((i, r, re, self) => {setTimeout(() => i !== 3 ? r(i): re(i), i)}),
          errorCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3 ],
      autoStart: true,
      cb,
      errorCB,
      finalCB(errors, responses) {
        expect(cb).toHaveBeenCalledTimes(3);
        expect(errorCB).toHaveBeenCalledTimes(1);
        expect(errors.length).toBe(1);
        expect(responses.length).toBe(2);
        expect(errors).toEqual(expect.arrayContaining([ {
          item: 3,
          reason: 3
        } ]));
        expect(responses).toEqual(expect.arrayContaining([ 1, 2 ]));
        console.log("All done!");
        done();
      }
    })
  });
  
  test("Chained Then Callback error & responses list", function (done) {
    const cb      = jest.fn((i, r, re, self) => {setTimeout(() => i !== 3 ? r(i): re(i), i)}),
          errorCB = jest.fn(),
          finalCB = jest.fn();
    SeqProm({
      list: [ 1, 2, 3 ],
      autoStart: true,
      cb,
      errorCB,
      finalCB,
    })
      .promise
      .then(([ errors, responses ]) => {
        expect(cb).toHaveBeenCalledTimes(3);
        expect(errorCB).toHaveBeenCalledTimes(1);
        expect(finalCB).toHaveBeenCalledTimes(1);
        expect(errors.length).toBe(1);
        expect(responses.length).toBe(2);
        expect(errors).toEqual(expect.arrayContaining([ {
          item: 3,
          reason: 3
        } ]));
        expect(responses).toEqual(expect.arrayContaining([ 1, 2 ]));
        console.log(errors.length, responses.length);
        done();
      });
  });
  
  test("Run 2 at once", function (done) {
    const error1    = jest.fn(),
          callBack1 = jest.fn((i, r) => {
            expect(i).toBe(1);
            r()
          }),
          error2    = jest.fn(),
          callBack2 = jest.fn((i, r) => {
            expect(i).toBe(2);
            r()
          });
    SeqProm({
      list: [ 1, 1, 1 ],
      cb: callBack1,
      errorCB: error1,
      autoStart: true,
      finalCB() {
        try {
          expect(callBack1).toHaveBeenCalledTimes(3);
          expect(error1).toHaveBeenCalledTimes(0);
        }
        catch (e) {
          return done(e);
        }
        return done();
      },
    });
    
    SeqProm({
      list: [ 2, 2, 2 ],
      cb: callBack2,
      errorCB: error2,
      autoStart: true,
      finalCB() {
        try {
          expect(callBack2).toHaveBeenCalledTimes(3);
          expect(error2).toHaveBeenCalledTimes(0);
        }
        catch (e) {
          return done(e);
        }
        return done();
      },
    });
  });
  // test("No resolve called", function (done) {
  //   const errorCB = jest.fn(),
  //         cb      = jest.fn((i, r) => {
  //           expect(i).toBe(1);
  //         });
  //   SeqProm({
  //     list: [ 1, 1, 1 ],
  //     cb,
  //     errorCB,
  //     autoStart: true,
  //     finalCB() {
  //       try {
  //         expect(cb).toHaveBeenCalledTimes(3);
  //         expect(errorCB).toHaveBeenCalledTimes(0);
  //       }
  //       catch (e) {
  //         return done(e);
  //       }
  //       return done();
  //     },
  //   });
  // });
};