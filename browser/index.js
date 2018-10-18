"use strict";

require("core-js/modules/web.dom.iterable");

require("core-js/modules/es6.array.iterator");

require("core-js/modules/es6.string.iterator");

require("core-js/modules/es6.promise");

require("core-js/modules/es6.regexp.to-string");

require("core-js/modules/es6.regexp.match");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * Created by adrianbrowning
 */
var blankFunction = function blankFunction() {};

function isTrue(value) {
  return value === true || (value || '').toLowerCase() === 'true';
}

function typeOf(e) {
  return {}.toString.call(e).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

function trackResponse(response) {
  this._responses.push(response);
}

function errorCallBack(self, item) {
  return function (reason) {
    self._errors.push({
      item: item,
      reason: reason
    });

    self.errorCB(item, reason);
  };
}

function buildBatchQueue(self) {
  function secondary(item) {
    return new Promise(function (resolve, reject) {
      return self.cb(item, resolve, reject, self);
    }).then(trackResponse.bind(self)).catch(errorCallBack(self, item));
  }

  var createAllPromise = function createAllPromise(items) {
    var pList = [];

    for (var i = 0; i < items.length; i++) {
      pList.push(secondary(items[i]));
    }

    return Promise.all(pList);
  };

  var nextBatch = function nextBatch(_start, _size) {
    _start = _start || 0;
    _size = _size || self.batchSize;
    if (self._stopped) return;
    return new Promise(function (res) {
      return createAllPromise(self.list.splice(_start, _size)).then(function () {
        res();
      });
    });
  };

  var loops = Math.ceil(self.list.length / self.poolSize);

  for (var i = 0; i < loops; i++) {
    self.promise = self.promise.then(nextBatch);
  }

  self.promise = self.promise.then(function () {
    return self.finalCB(self._errors, self._responses);
  }).then(function () {
    return [self._errors, self._responses];
  });
}

function buildPoolQueue(self) {
  function _poolGenerator() {
    var item = self.list.shift();
    if (!item) return;
    return createCBPromise(self, item).then(trackResponse.bind(self)).catch(errorCallBack(self, item)).then(_poolGenerator);
  }

  function createCBPromise(self, item) {
    return new Promise(function (resolve, reject) {
      if (self._stopped) return void resolve(null);
      return self.cb(item, resolve, reject, self);
    });
  }

  self.promise = self.promise.then(function () {
    var pool = [];

    for (var i = 0; i < self.poolSize; i++) {
      pool.push(_poolGenerator());
    }

    return Promise.all(pool);
  }).then(function () {
    return self.finalCB(self._errors, self._responses);
  }).then(function () {
    return [self._errors, self._responses];
  });
}

function createMasterPromise() {
  var promise,
      resolver = null;
  promise = new Promise(function (resolve) {
    resolver = resolve;
  });
  return {
    resolver: resolver,
    promise: promise
  };
}

var SeqPromiseClass =
/*#__PURE__*/
function () {
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
  function SeqPromiseClass(options) {
    _classCallCheck(this, SeqPromiseClass);

    if (typeOf(options.list) !== 'array') {
      throw new Error("Expecting list to be type Array, found type ".concat(typeOf(options.list)));
    }

    if (!(typeOf(options.cb) === 'function' || typeOf(options.cb) === 'asyncfunction')) {
      throw new Error("Expecting cb to be type Function, found type ".concat(typeOf(options.cb)));
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

    var wrappedMasterPromise = createMasterPromise();
    this.promise = wrappedMasterPromise.promise;
    this._globalPromiseResolver = wrappedMasterPromise.resolver; //Batch

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

  _createClass(SeqPromiseClass, [{
    key: "start",
    value: function start() {
      this._globalPromiseResolver();

      return this;
    } // noinspection JSUnusedGlobalSymbols

  }, {
    key: "stop",
    value: function stop() {
      this._stopped = !0;
    }
  }]);

  return SeqPromiseClass;
}(); // 'new' an object


var SeqPromise = function SeqPromise(options) {
  return new SeqPromiseClass(options);
}; // trick borrowed from jQuery so we don't have to use the 'new' keyword


SeqPromise.prototype = SeqPromiseClass.prototype;
module.exports = SeqPromise;