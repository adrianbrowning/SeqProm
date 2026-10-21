import SeqProm from 'seq-prom';

const [errors, responses] = await SeqProm({
  list     : [1, 2, 3],
  autoStart: true,
  cb(item, {resolve, reject}) {
    console.log(`Item [${item}] called!`);
    setTimeout(function() {
      if (item === 3) {
        return reject('Not sure about this!');
      } else {
        return resolve(item);
      }
    }, item);
  },
  errorCB(item, reason) {
    console.error(`Item [${item}] failed with error: ${reason}`);
  },
  finalCB(errors, response) {
    console.log('All done!');
  },
}).promise;

console.log(errors, responses);
