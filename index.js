/**
 * Created by adrianbrowning
 */

// 'new' an object
const SeqPromise = function(options) {
  return new SeqPromise.init(options);
};

// prototype holds methods (to save memory space)
SeqPromise.prototype = {
  stop : function() {this._gstopped = !0;},
  start : function() {this._gprom_res();return this;}
};

// the actual object is created here, allowing us to 'new' an object without calling 'new'
SeqPromise.init = function(options) {
  
  const self = this;
  let _glist      = options.list.slice(),//Create new array
      _gcb        = options.cb || function () {},
      _gfinalCB   = options.finalCB || function () {},
      _gcontext   = options.context,
      _gerrorCB   = options.errorCB || function () {},
      _gbatchSize = options.batchSize || 1,
      _guseStream = options.useStream === true || (options.useStream || "").toLowerCase() === "true",
      _gmaster_promise;
  self._gprom_res  = null;
  self._gstopped   = false;
  
  if (_gcontext) {
    _gcb = _gcb.bind(_gcontext);
    _gfinalCB = _gfinalCB.bind(_gcontext);
    _gerrorCB = _gerrorCB.bind(_gcontext);
  }

  function createMasterPromise() {
    let promise,
        prom_res = null;

    promise = new Promise(resolve => { prom_res = resolve;});
    return {
      prom_res,
      promise
    }
  }

  let prom =  createMasterPromise();
  _gmaster_promise = prom.promise;
  self._gprom_res = prom.prom_res;
  self.id = prom.id;

  const secondary = function (item) {
    return new Promise(function (resolve, reject) {
      if (typeof item == "function") {
        item(resolve, reject, self);
      } else {
        _gcb(item, resolve, reject, self);
      }
    }).catch(function (reason) {
      _gerrorCB(item, reason)
    });
  };

  if (_gbatchSize === 1) {
    _glist.push(_gfinalCB);
    _glist.reduce(function (sequence, item) {
      // Add these actions to the end of the sequence
      return sequence.then(function () {
        if (self._gstopped) return;
        return secondary(item);
      });
    }, _gmaster_promise);
  }
  else {
    if (_gbatchSize === -1) {
      _gbatchSize = _glist.length;
    }
    const createAllPromise = function (items) {
      let pList = [];
      for (let i = 0; i < items.length; i++) {
        pList.push(secondary(items[i]).catch(function (reason) {
          //Not sure this is actually called!
          console.warn(reason);
        }));
      }
      return Promise.all(pList);
    };

    const nextBatch = function (_start, _size) {
      _start = _start || 0;
      _size = _size || _gbatchSize;
      if (self._gstopped) return;
      return new Promise(res => {
        return createAllPromise(_glist.splice(_start, _size)).then(function () {
          console.log("Batch Done!");
          res();
        });
      });
    };
    let loops;
    if (!_guseStream) {
      loops = Math.ceil(_glist.length / _gbatchSize);
      for (let i = 0; i < loops; i++) {
        _gmaster_promise = _gmaster_promise.then(nextBatch);
      }
      _gmaster_promise.then(_gfinalCB);
    } else {

      let start = 0;
      const newSeqPromWrapper = function (start, idx, loops) {
        return new Promise(lRes => {
          SeqPromise({
            // context: _gcontext,
            list   : _glist.slice(start, loops * (idx + 1)),
            cb     : _gcb,
            finalCB: function (a, b, c) {
              console.log(`Stream done! ${c.id}`);
              lRes();
            },
            errorCB: _gerrorCB

          }).start();
        })
      };

      _gmaster_promise
        .then(function () {
          const loops    = Math.ceil(_glist.length / _gbatchSize),
                _masters = [];

          for (let i = 0; i < _gbatchSize; i++) {
            console.log("New sub master created!");
            _masters.push(newSeqPromWrapper(start, i, loops));

            start = (i + 1) * loops;
          }
          return new Promise(res => {
            Promise.all(_masters).then(res);
          })
        })
        .then(_gfinalCB);
    }
  }
};

// trick borrowed from jQuery so we don't have to use the 'new' keyword
SeqPromise.init.prototype = SeqPromise.prototype;

module.exports = SeqPromise;