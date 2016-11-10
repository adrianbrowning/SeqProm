/**
 * Created by adrianbrowning
 */

// 'new' an object
var SeQPromise = function(options) {
  return new SeQPromise.init(options);
};

// prototype holds methods (to save memory space)
SeQPromise.prototype = {
  stop : function() {this._gstopped = !0;},
  start : function() {this._gprom_res();return this;}
};

function run(self) {
  function createMasterPromise() {
    let prom_res;
    
    return {
      id : id,
      promise : new Promise(function (resolve, reject) {
        prom_res = resolve;
      }),
      prom_res: prom_res
    }
  }
  
  let prom =  createMasterPromise();
  self._gmaster_promise = prom.promise;
  self._gprom_res = prom.prom_res;
  self.id = prom.id;
  
  var secondary = function (item) {
    return new Promise(function (resolve, reject) {
      if (typeof item == "function") {
        item(resolve, reject, self);
      } else {
        self._gcb(item, resolve, reject, self);
      }
    }).catch(function (reason) {
      self._gerrorCB(item, reason)
    });
  };
  
  if (self._gbatchSize === 1) {
    self._glist.push(self._gfinalCB);
    self._glist.reduce(function (sequence, item) {
      // Add these actions to the end of the sequence
      return sequence.then(function () {
        if (self._gstopped) return;
        return secondary(item);
      });
    }, self._gmaster_promise);
  }
  else {
    if (self._gbatchSize === -1) {
      self._gbatchSize = self._glist.length;
    }
    var createAllPromise = function (items) {
      var pList = [];
      for (var i = 0; i < items.length; i++) {
        pList.push(secondary(items[i]).catch(function (reason) {
          //Not sure this is actually called!
          console.warn(reason);
        }));
      }
      return Promise.all(pList);
    };
    
    var nextBatch = function (_start, _size) {
      _start = _start || 0;
      _size = _size || self._gbatchSize;
      if (self._gstopped) return;
      return new Promise(function (res, rej) {
        return createAllPromise(self._glist.splice(_start, _size)).then(function () {
          console.log("Batch Done!");
          res();
        });
      });
    };
    var loops;
    if (!self._guseStream) {
      loops = Math.ceil(self._glist.length / self._gbatchSize);
      for (var i = 0; i < loops; i++) {
        self._gmaster_promise = self._gmaster_promise.then(nextBatch);
      }
      self._gmaster_promise.then(self._gfinalCB);
    } else {
      
      let start = 0;
      var newSeqPromWrapper= function(start, idx, loops){
        return new Promise(function(lRes, lRej){
          SeQPromise({
            // context: self._gcontext,
            list   : self._glist.slice(start, loops * (idx + 1)),
            cb     : self._gcb,
            finalCB: function(a,b,c){
              console.log(`Stream done! ${c.id}`);
              lRes();
            },
            errorCB: self._gerrorCB
            
          }).start();
        })
      };
      
      self._gmaster_promise
          .then(function () {
            var loops = Math.ceil(self._glist.length / self._gbatchSize),
                _masters = [];
        
            for (let i = 0; i < self._gbatchSize; i++) {
              console.log("New sub master created!");
              _masters.push(newSeqPromWrapper(start, i, loops));
          
              start = (i + 1) * loops;
            }
            return new Promise(function (a, b) {
              Promise.all(_masters).then(a);
            })
          })
          .then(self._gfinalCB);
    }
    
  }
}

// the actual object is created here, allowing us to 'new' an object without calling 'new'
SeQPromise.init = function(options) {
  
  var self = this;
  self._gstopped = false;
  self._glist    = options.list.slice();//Create new array
  self._gcb      = options.cb || function () {};
  self._gfinalCB = options.finalCB || function () {};
  self._gcontext = options.context;
  self._gerrorCB = options.errorCB || function () {};
  self._gbatchSize = options.batchSize || 1;
  self._guseStream = options.useStream === true || (options.useStream || "").toLowerCase() === "true";
  self._gprom_res = null;
  self._gmaster_promise = null;
  
  if (self._gcontext) {
    self._gcb = self._gcb.bind(self._gcontext);
    self._gfinalCB = self._gfinalCB.bind(self._gcontext);
    self._gerrorCB = self._gerrorCB.bind(self._gcontext);
  }
  
  run(self);
};

// trick borrowed from jQuery so we don't have to use the 'new' keyword
SeQPromise.init.prototype = SeQPromise.prototype;

module.exports = SeQPromise;