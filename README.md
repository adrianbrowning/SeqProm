# SeqProm
Repo for Sequential Promises project

## Installation

  `npm install seq-prom --save`

## Options

| Option | Type | Description | Default | Required? |
|-----------|----------|--------------------------------------------------------------------------------------------------|---------|-----------|
| list | Array | List of items to iterate through |  | Yes |
| cb | Function | Function called when time to process next item |  | Yes |
| batchSize | Integer | Size of the batch, or if using stream mode, how many streams to use | 1 | No |
| errorCB | Function | Called when there is an error, with the item and reason for error |  | No |
| finalCB | Function | Called when all is done. Passes in a list of errors, and any items, passed to the resolve method |  | No |
| useStream | Boolean | Will switch to stream mode, which meaning multiple queues are created with the list | false | No |
| autoStart | Boolean | Instead of having to call .start() will do this for you | false | No |

## Usage

###Basic Example

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
    
###Other Options
       
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
    })
    .promise
    .then(function(){
      console.log("Called after all is said and done");
    });
   

##Functions

###cb

| Argument | Description                                       |
|----------|---------------------------------------------------|
| item     | Item from the list                                |
| resolver | The resolve function from the promise             |
| rejecter | The reject function from the promise              |
| self     | `this` passed through. Can call `.stop()` on this |
| threadId | If in stream mode, then this will be the threadId |
      

###errorCB

| Argument | Description                                                           |
|----------|-----------------------------------------------------------------------|
| item     | Item from the list                                                    |
| reason   | Reason for the error, either from the reject method or a caught error |

###finalCB

| Argument  | Description                                       |
|-----------|---------------------------------------------------|
| error     | List of errors that have occured                  |
| response  | List of items passed back to the resolve function |
      
###Promise Response

    const SeqProm = require("seq-prom");
    
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
        }, item * 1000);
      },
      errorCB (item, reason) {
        console.error(`Item [${item}] failed with error: ${reason}`);
      },
      finalCB (errors, response){
        console.log("All done!");
      }
    })
    .promise
    .then(([errors, responses])=> console.log(errors, responses));         

## Tests

  `npm test`

## Release History

* 1.1.0 
	* Updates to allow passage of data
	* Added more tests 	
	* Added autStart option
	* Added ability to chain off of promise
* 1.0.0 Initial release