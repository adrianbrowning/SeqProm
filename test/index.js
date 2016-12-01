/**
 * Created by adrianbrowning on 01/12/2016.
 */
const expect = require('chai').expect,
    SeqProm = require('../index');

  it('All items resolve', function(done) {
    // return new Promise((res)=>{
      let errCount = 0;
      SeqProm({
        list: [1, 2, 3],
        cb  (item, resolve, reject) {
          return resolve();
        },
        errorCB (item, reason) {
          errCount++;
        },
        finalCB (){
          try {
            expect(errCount).to.equal(0);
          } catch (e) {
            return done(e);
          }
          // res();
          return done();
        }
      }).start();
    // });
  });

it('One item fail resolve', function(done) {
    let errCount = 0;
    SeqProm({
      list: [1, 2, 3],
      cb  (item, resolve, reject) {
        // console.log(`Item [${item}] called!`);
          if (item == 3) {
            return reject("Too big");
          }
          return resolve();
      },
      errorCB (item, reason) {
        errCount++;
        // console.error(`Item [${item}] failed with error: ${reason}`);
      },
      finalCB (){
        try {
          expect(errCount).to.equal(1);
        } catch (e) {
          console.log("Caught Error:",e);
          return done(e);
        }
        return done();
      }
    }).start();
});


it('Stop before complete', function(done) {
  let counter = 0;
  SeqProm({
    list: [1, 2, 3],
    cb  (item, resolve, reject, self) {
      // console.log(`Item [${item}] called!`);
      if (counter++ === 0) {
        self.stop();
        setTimeout(()=>{
          if (counter > 1) {
            return done(new Error(`Called more times! Expected [1] got [${counter}]`));
          }
          return done();
        },10);
      }
      return resolve();
    },
    errorCB (item, reason) {
      done(new Error("ErrorCB was called!"));
      // console.error(`Item [${item}] failed with error: ${reason}`);
    },
    finalCB (){
      try {
        expect(counter).to.equal(1);
      } catch (e) {
        console.log("Caught Error:",e);
        return done(e);
      }
      return done();
    }
  }).start();
});