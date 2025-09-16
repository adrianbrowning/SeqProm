/**
 * Created by adrianbrowning
 */

type ItemError<T> = {
    item: T,
    reason: string
};


type SeqPromOptionsSchema<T, RT = any> = {
    list: ReadonlyArray<T>;
    cb: (item: T, resolve: Resolver, reject: Rejecter, self?: SeqPromiseClass) => RT;
    finalCB?: (errors: Array<ItemError<T>>, items: ReadonlyArray<RT>) => any;
    errorCB?: (item: T, reason: string) => void;
    useBatch?: boolean;
    autoStart?: boolean;
    batchSize?: number;
    poolSize?: number;
    context?: any;
}

type Resolver = (value?: unknown) => void;
type Rejecter = (reason?: any) => void;

function isTrue(value: boolean | string | undefined) {
    return (value === true) || (value || '').toLowerCase() === 'true';
}

function typeOf(e: unknown) {
    if (e === null) return 'null';
    //@ts-expect-error not null anymore
    return ({}).toString.call(e).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

function trackResponse(this: SeqPromiseClass, response: any): void {
    this._responses.push(response);
}

function errorCallBack<ItemT>(self: SeqPromiseClass, item: ItemT): (reason: any) => void {
    return function (reason: any): void {
        self._errors.push({
            item,
            reason
        });
        if (self.errorCB) {
            self.errorCB(item, reason);
        }
    };
}

function buildBatchQueue(self: SeqPromiseClass): void {

    function secondary(item: any): Promise<any> {
        return new Promise(function (resolve, reject): any {
            return self.cb(item, resolve, reject, self);
        })
            .then(trackResponse.bind(self))
            .catch(errorCallBack(self, item));
    }

    const createAllPromise = function (items: Array<any>) {
        let pList: Array<Promise<any>> = [];
        for (let i = 0; i < items.length; i++) {
            pList.push(secondary(items[i]));
        }
        return Promise.all(pList);
    };

    const nextBatch = function (_start?: number, _size?: number) {
        _start = _start || 0;
        _size = _size || self.batchSize;
        if (self._stopped) return;
        return new Promise(res => {
            return createAllPromise(self.list.splice(_start, _size)).then(function () {
                res(undefined);
            });
        });
    };
    const loops = Math.ceil(self.list.length / self.poolSize);
    for (let i = 0; i < loops; i++) {
        self.promise = self.promise.then(nextBatch);
    }
    self.promise = self.promise
        .then(() => {
            if(self.finalCB) self.finalCB(self._errors, self._responses)
        })
        .then(() => [self._errors, self._responses]);
}

function buildPoolQueue(self: SeqPromiseClass) {
    function _poolGenerator(): Promise<any> | undefined {
        const item = self.list.shift();
        if (!item) return;
        return createCBPromise(self, item)
            .then(trackResponse.bind(self))
            .catch(errorCallBack(self, item))
            .then(_poolGenerator);
    }

    function createCBPromise(self: SeqPromiseClass, item: any) {
        return new Promise((resolve: Resolver, reject: Rejecter) => {
            if (self._stopped) return void resolve(null);
            return self.cb(item, resolve, reject, self);
        });
    }

    self.promise =
        self.promise
            .then(function () {
                const pool: Array<Promise<any> | undefined> = [];

                for (let i = 0; i < self.poolSize; i++) {
                    pool.push(_poolGenerator());
                }

                return Promise.all(pool);
            })
            .then(() => {
                if(self.finalCB) self.finalCB(self._errors, self._responses)
            })
            .then(() => [self._errors, self._responses]);
}

type MasterPromise = {
    resolver: Resolver;
    promise: Promise<any>;
}

function createMasterPromise(): MasterPromise {
    let promise: Promise<any>;
    let resolver: Resolver = null as unknown as Resolver;

    promise = new Promise(resolve => {
        resolver = resolve;
    });
    return {
        resolver,
        promise,
    };
}

class SeqPromiseClass<ItemType = any> {
    list: Array<ItemType>;
    cb: SeqPromOptionsSchema<ItemType>["cb"];
    finalCB: SeqPromOptionsSchema<ItemType>["finalCB"];
    errorCB: SeqPromOptionsSchema<ItemType>["errorCB"];
    useBatch: boolean;
    batchSize: number;
    poolSize: number;
    promise: Promise<any>;
    _globalPromiseResolver: Resolver;
    _stopped: boolean;
    _errors: Array<ItemError<ItemType>>;
    _responses: any[];

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

    constructor(options: SeqPromOptionsSchema<ItemType>) {

        if (typeOf(options.list) !== 'array') {
            throw new Error(`Expecting list to be type Array, found type ${typeOf(options.list)}`);
        }

        if (!(typeOf(options.cb) === 'function' || typeOf(options.cb) === 'asyncfunction')) {
            throw new Error(`Expecting cb to be type Function, found type ${typeOf(options.cb)}`);
        }

        this.list = options.list.slice() as Array<ItemType>;
        this.cb = options.cb;
        this.finalCB = options.finalCB || function (): void {};
        this.errorCB = options.errorCB || function (): void {};
        this.useBatch = isTrue(options.useBatch);
        this.batchSize = options.batchSize || 1;
        this.poolSize = options.poolSize || 1;

        this.promise = Promise.resolve();
        this._globalPromiseResolver = () => {};
        this._stopped = false;
        this._errors = [];
        this._responses = [];

        if (options.context) {
            this.cb = options.cb.bind(options.context);
            this.finalCB = options.finalCB
                ? options.finalCB.bind(options.context)
                : function (): void {};
            this.errorCB = options.errorCB
                ? options.errorCB.bind(options.context)
                : function (): void {};
        }

        if (options.poolSize && options.poolSize >= options.list.length) {
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

// Factory function
function SeqPromise<T>(options: SeqPromOptionsSchema<T>): SeqPromiseClass {
    return new SeqPromiseClass(options);
}

// trick borrowed from jQuery so we don't have to use the 'new' keyword
SeqPromise.prototype = SeqPromiseClass.prototype;

export default SeqPromise;
export {SeqPromise};
export type SeqPromise = typeof SeqPromise;