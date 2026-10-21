import SeqProm from 'seq-prom';

const seqProm = SeqProm({
  list: [1, 2, 3],
  cb(item, {resolve, reject}) {
    console.log(`Item [${item}] called!`);
    setTimeout(function () {
      if (item === 3) {
        return reject("Not sure about this!");
      } else {
        return resolve();
      }
    }, item);
  },
  errorCB (item, reason) {
    console.error(`Item [${item}] failed with error: ${reason}`);
  },
  finalCB (){
    console.log("All done!");
  }
});

seqProm.start();

await seqProm.promise;

