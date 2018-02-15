/**
 * Created by adrianbrowning on 15/02/2018.
 */
const SeqProm = require("seq-prom");

SeqProm({
  list: [1, 2, 3, 4],
  autoStart: true,
  useStream : true,
  batchSize : 2,
  cb  (item, resolve, reject) {
    console.log(`Item [${item}] called!`);
    setTimeout(function () {
      if (item === 3) {
        return reject("Not sure about this!");
      } else {
        return resolve(item);
      }
    }, item * 1000);
  },
  errorCB (item, reason) {
    console.error(`Item [${item}] failed with error: ${reason}`);
  },
  finalCB (errors, responses){
    console.log("All done!");
    console.dir(errors);
    console.dir(responses);
  }
});