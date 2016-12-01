/**
 * Created by adrianbrowning on 10/11/2016.
 */
const SeqProm = require("./index.js");

let seqProm = SeqProm({
  list: [1, 2, 3],
  cb  (item, resolve, reject) {
    console.log(`Item [${item}] called!`);
    setTimeout(function () {
      if (item === 3) {
        return reject("Not sure about this!");
      } else {
        return resolve();
      }
    }, item * 1000);
  },
  errorCB (item, reason) {
    console.error(`Item [${item}] failed with error: ${reason}`);
  },
  finalCB (){
    console.log("All done!");
  }
});

seqProm.start();
