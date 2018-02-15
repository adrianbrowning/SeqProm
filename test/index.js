/**
 * Created by adrianbrowning on 01/12/2016.
 */
const expect  = require('chai').expect,
      SeqProm = require('../index');

it('All items resolve - List', function(done) {
  let errCount = 0, counter = 0;
  SeqProm({
    list: [1, 2, 3],
    cb(item, resolve/*, reject*/) {
      counter++;
      return resolve();
    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB() {
      try {
        expect(counter).to.equal(3);
        expect(errCount).to.equal(0);
      } catch (e) {
        return done(e);
      }
      return done();
    },
  }).start();
});

it('All items resolve - Batch', function(done) {
  let errCount = 0, counter = 0;
  SeqProm({
    list: [1, 2, 3,1, 2, 3,1, 2, 3,1, 2, 3],
    batchSize: 3,
    cb(item, resolve/*, reject*/) {
      counter++;
      return resolve();
    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB() {
      try {
        expect(counter).to.equal(12);
        expect(errCount).to.equal(0);
      } catch (e) {
        return done(e);
      }
      return done();
    },
  }).start();
});

it('All items resolve - Streaming', function(done) {
  let errCount = 0, counter = 0;
  SeqProm({
    list     : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    useStream: true,
    batchSize: 3,
    cb(item, resolve/*, reject, self, thread*/) {

      setTimeout(function() {
        counter++;
        return resolve();
      }, item);

    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB() {
      try {
        expect(errCount).to.equal(0);
        expect(counter).to.equal(15);
      } catch (e) {
        return done(e);
      }
      return done();
    },
  }).start();
});

it('One item fail resolve', function(done) {
  let errCount = 0;
  SeqProm({
    list: [1, 2, 3],
    cb(item, resolve, reject) {
      if (item === 3) {
        return reject('Too big');
      }
      return resolve();
    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB() {
      try {
        expect(errCount).to.equal(1);
      } catch (e) {
        console.log('Caught Error:', e);
        return done(e);
      }
      return done();
    },
  }).start();
});

it('Stop before complete - list', function(done) {
  let counter = 0;
  SeqProm({
    list     : [1, 2, 3],
    cb(item, resolve, reject, self) {
      if (counter++ === 0) {
        self.stop();
        setTimeout(() => {
          if (counter > 1) {
            return done(new Error(`Called more times! Expected [1] got [${counter}]`));
          }
        }, 10);
      }
      return resolve();
    },
    errorCB(/*item, reason*/) {
      done(new Error('ErrorCB was called!'));
    },
    finalCB() {
      try {
        expect(counter).to.equal(1);
      } catch (e) {
        console.log('Caught Error:', e);
        return done(e);
      }
      return done();
    },
  }).start();
});

it('Stop before complete - batch', function(done) {
  let counter = 0;
  SeqProm({
    list     : [1, 2, 3, 1, 2, 3, 1, 2, 3],
    batchSize: 3,
    cb(item, resolve, reject, self) {
      if (counter++ === 0) {
        self.stop();
        setTimeout(() => {
          if (counter > 3) {
            return done(new Error(`Called more times! Expected [3] got [${counter}]`));
          }
        }, 10);
      }
      return resolve();
    },
    errorCB(/*item, reason*/) {
      done(new Error('ErrorCB was called!'));
    },
    finalCB() {
      try {
        expect(counter).to.equal(3);
      } catch (e) {
        console.log('Caught Error:', e);
        return done(e);
      }
      return done();
    },
  }).start();
});

it('Stop before complete - stream', function(done) {
  let counter = 0;
  SeqProm({
    list     : [1, 2, 3, 1, 2, 3, 1, 2, 3],
    batchSize: 3,
    useStream: true,
    cb(item, resolve, reject, self) {
      if (counter++ === 0) {
        self.stop();
        setTimeout(() => {
          if (counter > 1) {
            return done(new Error(`Called more times! Expected [1] got [${counter}]`));
          }
          return done();
        }, 10);
      }
      return resolve();
    },
    errorCB(/*item, reason*/) {
      done(new Error('ErrorCB was called!'));
    },
    finalCB() {
      try {
        expect(counter).to.equal(1);
      } catch (e) {
        console.log('Caught Error:', e);
        return done(e);
      }
      return done();
    },
  }).start();
});

it('Data pass through - list', function(done) {
  let errCount = 0;
  SeqProm({
    list: [1, 2, 3],
    cb(item, resolve, reject) {
      setTimeout(function() {
        if (item % 2) return resolve(item);
        return reject(item);
      }, item);
    },
    errorCB(/*item, reason*/) {
      return errCount++;
    },
    finalCB(errors, responses) {
      try {
        expect(errCount).to.equal(1);
        expect(errors.length).to.equal(1);
        expect(responses.length).to.equal(2);
      } catch (e) {
        return done(e);
      }
      return done();
    },
  }).start();
});

it('Data pass through - batch', function(done) {
  let errCount = 0;
  SeqProm({
    list: [1, 2, 3, 1, 2, 3, 1, 2, 3],
    batchSize : 3,
    cb(item, resolve, reject) {
      setTimeout(function() {
        if (item % 3) return resolve(item);
        return reject(item);
      }, item);
    },
    errorCB(/*item, reason*/) {
      return errCount++;
    },
    finalCB(errors, responses) {
      try {
        expect(errCount).to.equal(3);
        expect(errors.length).to.equal(3);
        expect(responses.length).to.equal(6);
      } catch (e) {
        return done(e);
      }
      return done();
    },
  }).start();
});

it('Data pass through - streaming', function(done) {
  let errCount = 0;
  SeqProm({
    list     : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    useStream: true,
    batchSize: 3,
    cb(item, resolve, reject, self, thread) {

      setTimeout(function() {
        if (item % 3) return resolve([thread, item]);
        return reject(item);
      }, item);

    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB(errors, responses) {
      try {
        expect(errCount).to.equal(5);
        expect(errors.length).to.equal(5);
        expect(responses.length).to.equal(10);
      } catch (e) {
        return done(e);
      }
      return done();
    },
  }).start();
});

it('Auto Start', function(done) {
  let errCount = 0;
  SeqProm({
    list     : [1, 2, 3],
    autoStart: true,
    cb(item, resolve, reject) {
      setTimeout(function() {
        if (item % 2) return resolve(item);
        return reject(item);
      }, item);
    },
    errorCB(/*item, reason*/) {
      return errCount++;
    },
    finalCB(errors, responses) {
      try {
        expect(errCount).to.equal(1);
        expect(errors.length).to.equal(1);
        expect(responses.length).to.equal(2);
      } catch (e) {
        return done(e);
      }
      return done();
    },
  });
});

it('No Callbacks', function(done) {
  let count = 0;
  SeqProm({
    list     : [1, 2, 3],
    autoStart: true,
    cb(item, resolve, reject) {
      setTimeout(function() {
        count++;
        // if (++count === 3) done();
        if (item % 2) return resolve(item);
        return reject(item);
      }, item);
    },
  }).promise.then(_=>{
    try {
      expect(count).to.equal(3);
    } catch (e) {
      return done(e);
    }

    done();
  });
});

it('Return promise - List', function(done) {
  let errCount = 0, counter = 0, finish = false;
  SeqProm({
    list: [1, 2, 3],
    cb(item, resolve/*, reject*/) {
      counter++;
      return resolve();
    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB() {
      try {
        expect(counter).to.equal(3);
        expect(errCount).to.equal(0);
      } catch (e) {
        return done(e);
      }
      finish = true;
    },
  }).start().promise.then(_=>{
    try {
      expect(finish).to.equal(true);
    } catch (e) {
      return done(e);
    }

    done();
  });
});

it('Return promise - Batch', function(done) {
  let errCount = 0, counter = 0, finish = false;
  SeqProm({
    list: [1, 2, 3,1, 2, 3,1, 2, 3,1, 2, 3],
    batchSize: 3,
    cb(item, resolve/*, reject*/) {
      counter++;
      return resolve();
    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB() {
      try {
        expect(counter).to.equal(12);
        expect(errCount).to.equal(0);
      } catch (e) {
        return done(e);
      }
      finish = true;
    },
  }).start().promise.then(_=>{
    try {
      expect(finish).to.equal(true);
    } catch (e) {
      return done(e);
    }

    done();
  });
});

it('Return promise - Streaming', function(done) {
  let errCount = 0, counter = 0;
  SeqProm({
    list     : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    useStream: true,
    batchSize: 3,
    cb(item, resolve/*, reject, self, thread*/) {

      setTimeout(function() {
        counter++;
        return resolve();
      }, item);

    },
    errorCB(/*item, reason*/) {
      errCount++;
    },
    finalCB() {
      try {
        expect(errCount).to.equal(0);
        expect(counter).to.equal(15);
      } catch (e) {
        return done(e);
      }
      finish = true;
    },
  }).start().promise.then(_=>{
    try {
      expect(finish).to.equal(true);
    } catch (e) {
      return done(e);
    }

    done();
  });
});

it("blah", function(done){
  SeqProm({
    list: [1, 2, 3],
    autoStart : true,
    cb  (item, resolve, reject) {
      console.log(`Item [${item}] called!`);
      setTimeout(function () {
        if (item === 3) {
          return reject("Not sure about this!");
        } else {
          return resolve(item);
        }
      }, item * 10);
    },
    errorCB (item, reason) {
      console.error(`Item [${item}] failed with error: ${reason}`);
    },
    finalCB (errors, reponses){
      console.log("All done!");
    }
  })
      .promise
      .then(([errors, reponses])=> {console.log(errors.length, reponses.length); done();});
});