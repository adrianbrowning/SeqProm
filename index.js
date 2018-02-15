/**
 * Created by adrianbrowning
 */

// 'new' an object
const SeqPromise = function(options) {
  return new SeqPromise.init(options);
};

// prototype holds methods (to save memory space)
SeqPromise.prototype = {
  stop : function() {this._stopped = !0;},
  start: function() {
    this._globalPromiseResolver();
    return this;
  },
};

function isTrue(value) {
  return (value === true) || (value || '').toLowerCase() === 'true';
}

function typeOf(e) {
  return ({}).toString.call(e).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

// the actual object is created here, allowing us to 'new' an object without calling 'new'
SeqPromise.init = function(options) {

  const self          = this,
  blankFunction = function(){};

  if (typeOf(options.list) !== 'array') {
    throw new Error(`Expecting list to be type Array, found type ${typeOf(options.list)}`);
  }

  if (typeOf(options.cb) !== 'function') {
    throw new Error(`Expecting cb to be type Function, found type ${typeOf(options.cb)}`);
  }

  options.list = options.list.slice();

  options.finalCB = options.finalCB || blankFunction;
  options.errorCB = options.errorCB || blankFunction;
  options.batchSize = options.batchSize || 1;
  options.useStream = isTrue(options.useStream);

  self.promise = null;
  self._globalPromiseResolver = null;
  self._stopped = false;
  self._errors = [];
  self._responses = [];

  if (options.context) {
    options.cb = options.cb.bind(options.context);
    options.finalCB = options.finalCB.bind(options.context);
    options.errorCB = options.errorCB.bind(options.context);
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

  function errorCallBack(item, reason) {
    self._errors.push({item, reason});
    options.errorCB(item, reason);
  }

  function trackResponse(response) {
    self._responses.push(response);
  }

  function secondary(item) {
    return new Promise(function(resolve, reject) {
      if (typeof item === 'function') {
        return item(resolve, reject, self);
      } else {
        return options.cb(item, resolve, reject, self);
      }
    })
        .then(trackResponse)
        .catch(errorCallBack.bind(null, item));
  }

  let prom = createMasterPromise();
  self.promise = prom.promise;
  self._globalPromiseResolver = prom.resolver;

  if (options.batchSize === 1) {
    // options.list.push();
    self.promise = options.list.reduce(function(sequence, item) {
      // Add these actions to the end of the sequence
      return sequence.then(function() {
        if (self._stopped) return;
        return secondary(item);
      });
    }, self.promise)
        .then(options.finalCB.bind(options.context || null, self._errors, self._responses))
        .then(_=>[self._errors, self._responses]);
  }
  else {
    if (options.batchSize === -1) {
      options.batchSize = options.list.length;
    }
    const createAllPromise = function(items) {
      let pList = [];
      for (let i = 0; i < items.length; i++) {
        pList.push(secondary(items[i]));
      }
      return Promise.all(pList);
    };

    const nextBatch = function(_start, _size) {
      _start = _start || 0;
      _size = _size || options.batchSize;
      if (self._stopped) return;
      return new Promise(res => {
        return createAllPromise(options.list.splice(_start, _size)).then(function() {
          res();
        });
      });
    };

    let loops;
    if (!options.useStream) {
      loops = Math.ceil(options.list.length / options.batchSize);
      for (let i = 0; i < loops; i++) {
        self.promise = self.promise.then(nextBatch);
      }
      self.promise = self.promise
          .then(options.finalCB.bind(options.context || null, self._errors, self._responses))
          .then(_=>[self._errors, self._responses]);
    } else {
      self.promise = self.promise
          .then(function() {
            const promArray = [];

            const genPromChain = function(list, threadId) {
              return function(resolve) {
                return list.reduce((promise, item) => promise
                        .then(function() {
                          return new Promise((resolve, reject) => {
                            if (self._stopped) return;
                            return options.cb(item, resolve, reject, self, threadId);
                          });
                        })
                        .then(trackResponse)
                        .catch(errorCallBack.bind(null, item)),
                    Promise.resolve())
                    .then(resolve);
              };
            };

            const threads = [];
            options.list.forEach((item, idx) => {
              const pos = idx % options.batchSize;
              threads[pos] = threads[pos] || [];
              threads[pos].push(item);
            });

            for (let i = 0; i < options.batchSize; i++) {
              promArray.push(new Promise(genPromChain(threads[i], i)));
            }

            return Promise.all(promArray);
          })
          .then(options.finalCB.bind(options.context || null, self._errors, self._responses))
          .then(_=>[self._errors, self._responses]);
    }
  }

  if (isTrue(options.autoStart)) {
    this._globalPromiseResolver();
    return this;
  }
};

// trick borrowed from jQuery so we don't have to use the 'new' keyword
SeqPromise.init.prototype = SeqPromise.prototype;

module.exports = SeqPromise;