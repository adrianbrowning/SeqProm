# SeqProm
Repo for Sequential Promises project

## Installation

  `npm install seq-prom --save`

## Usage

    const SeqProm = require("seq-prom");
    
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
      
## Tests

  `npm test`

## Release History

* 1.0.0 Initial release