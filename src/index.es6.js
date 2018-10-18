/**
 * Created by adrianbrowning
 */

const blankFunction = function () {};

function isTrue(value) {
  return (value === true) || (value || '').toLowerCase() === 'true';
}

function typeOf(e) {
  return ({}).toString.call(e).match(/\s([a-zA-Z]+)/)[ 1 ].toLowerCase();
}

function trackResponse (response) {
  this._responses.push(response);
}

function errorCallBack(self, item) {
  return function(reason) {
    self._errors.push({
      item,
      reason
    });
    self.errorCB(item, reason);
  };
}

function buildBatchQueue(self) {
  
  function secondary(item) {
    return new Promise(function (resolve, reject) {
      if (typeof item === 'function') {
        return item(resolve, reject, self);
      } else {
        return self.cb(item, resolve, reject, self);
      }
    })
      .then(trackResponse.bind(self))
      .catch(errorCallBack(self, item));
  }
  
  const createAllPromise = function (items) {
    let pList = [];
    for (let i = 0; i < items.length; i++) {
      pList.push(secondary(items[ i ]));
    }
    return Promise.all(pList);
  };
  
  const nextBatch = function (_start, _size) {
    _start = _start || 0;
    _size = _size || self.batchSize;
    if (self._stopped) return;
    return new Promise(res => {
      return createAllPromise(self.list.splice(_start, _size)).then(function () {
        res();
      });
    });
  };
  const loops = Math.ceil(self.list.length / self.poolSize);
  for (let i = 0; i < loops; i++) {
    self.promise = self.promise.then(nextBatch);
  }
  self.promise = self.promise
                     .then(() => self.finalCB(self._errors, self._responses))
                     .then(() => [ self._errors, self._responses ]);
}

function buildPoolQueue(self) {
  function _poolGenerator() {
    const item = self.list.shift();
    if (!item) return;
    return createCBPromise(self, item)
      .then(trackResponse.bind(self))
      .catch(errorCallBack(self, item))
      .then(_poolGenerator);
  }
  
  function createCBPromise(self, item) {
    return new Promise((resolve, reject) => {
      if (self._stopped) return void resolve(null);
      return self.cb(item, resolve, reject, self);
    });
  }
  
  self.promise =
    self.promise
        .then(function () {
          const pool = [];
          
          for (let i = 0; i < self.poolSize; i++) {
            pool.push(_poolGenerator());
          }
          
          return Promise.all(pool);
        })
        .then(() => self.finalCB(self._errors, self._responses))
        .then(() => [ self._errors, self._responses ]);
}

function createMasterPromise() {
  let promise,
      resolver = null;
  
  promise = new Promise(resolve => { resolver = resolve;});
  return {
    resolver,
    promise,
  };
}

class SeqPromiseClass {
  /**
   * SeqPromise the actual object is created here, allowing us to 'new' an object without calling 'new'
   * @param {Object} options - The options for setting the chain
   * @param {number} options.poolSize - The size of "simulated" thread pool
   * @param {boolean} options.autoStart - Will start the processing as soon as initialisation is complete
   * @param {*[]} options.list - The list of items to iterate over asynchronously
   * @param {boolean} options.useBatch - Switches from Stream mode, to batch
   * @param {number} options.batchSize - The size of each batch
   * @param {Object} options.context - Context to run functions in
   * @param {cb} options.cb - A function that returns a promise
   * @param {finalCB} options.finalCB - A function that that will be called once all done
   * @param {errorCB} options.errorCB - A function that returns a promise
   *
   * @callback cb
   * @param {*} Item - Item from the list
   * @param {*} Resolve - Resolve function for successful call
   * @param {*} Reject - Reject function for failed call
   * @param {*} Self - Item from the list
   *
   * @callback finalCB
   * @param {*[]} Errors - List of failed items
   * @param {*[]} Responses - List of completed items
   *
   * @callback errorCB
   * @param {*} Item - Item that failed
   * @param {*} Reason - Reason for failure, passed from reject
   */
  
  constructor(options) {
    if (typeOf(options.list) !== 'array') {
      throw new Error(`Expecting list to be type Array, found type ${typeOf(options.list)}`);
    }
    
    if (typeOf(options.cb) !== 'function') {
      throw new Error(`Expecting cb to be type Function, found type ${typeOf(options.cb)}`);
    }
    
    this.list = options.list.slice();
    this.cb = options.cb;
    this.finalCB = options.finalCB || blankFunction;
    this.errorCB = options.errorCB || blankFunction;
    this.useBatch = isTrue(options.useBatch);
    this.batchSize = options.batchSize || 1;
    this.poolSize = options.poolSize || 1;
    
    this.promise = null;
    this._globalPromiseResolver = null;
    this._stopped = false;
    this._errors = [];
    this._responses = [];
    
    if (options.context) {
      this.cb = options.cb.bind(options.context);
      this.finalCB = options.finalCB.bind(options.context);
      this.errorCB = options.errorCB.bind(options.context);
    }
    
    if (options.poolSize >= options.list.length) {
      this.poolSize = options.list.length;
    }
    
    let wrappedMasterPromise = createMasterPromise();
    this.promise = wrappedMasterPromise.promise;
    this._globalPromiseResolver = wrappedMasterPromise.resolver;
    
    //Batch
    if (options.useBatch) {
      buildBatchQueue(this);
    } else {
      buildPoolQueue(this);
    }
    
    if (isTrue(options.autoStart)) {
      this._globalPromiseResolver();
      return this;
    }
  }
  
  start() {
    this._globalPromiseResolver();
    return this;
  }
  
  // noinspection JSUnusedGlobalSymbols
  stop() {
    this._stopped = !0;
  }
}

// 'new' an object
const SeqPromise = function (options) {
  return new SeqPromiseClass(options);
};

// trick borrowed from jQuery so we don't have to use the 'new' keyword
SeqPromise.prototype = SeqPromiseClass.prototype;

module.exports = SeqPromise;