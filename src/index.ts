/**
 * Created by adrianbrowning
 */

type ItemError<T> = {
    item: T,
    reason: string | Error
};
type ItemSuccess<T, RT> = {
    item: T,
    result: RT
};

export type Func_CB<T, RT> = (item: T,
                              extra: {
                                  resolve: (value: (RT | PromiseLike<RT>)) => void,
                                  reject: Rejecter,
                                  self: SeqPromiseClass<RT, NoInfer<T>>
                              }) => Promise<RT> | void | RT;


export type Func_ERR<T> = (item: T, reason: ItemError<void>["reason"]) => void;

type SeqPromOptionsSchema<RT, T> = {
    list: ReadonlyArray<T>;
    cb: Func_CB<T, RT>;
    finalCB?: (errors: Array<ItemError<T>>, items: ReadonlyArray<ItemSuccess<T, RT>>) => any;
    errorCB?: Func_ERR<T>;
    useBatch?: boolean;
    autoStart?: boolean;
    size?: number;
    context?: any;
}

type Resolver<RT = unknown, T = unknown > = (value?: (SeqPromResult<RT, T> | PromiseLike<SeqPromResult<RT, T>>)) => void;
type Rejecter = (reason?: string | Error) => void;

/**
 * Check if a value should be interpreted as "true"
 * @param value - Value to check
 * @returns True if the value is boolean true or the string "true" (case insensitive)
 */
function isTrue(value: boolean | string | undefined): boolean {
    return (value === true) || (value || '').toLowerCase() === 'true';
}

/**
 * Get the type of a value as a string
 * @param e - Any value to check the type of
 * @returns The lowercase type name (e.g., 'string', 'array', 'object', 'function')
 */
function typeOf(e: unknown): string {
    if (e === null) return 'null';
    const match = ({}).toString.call(e).match(/\s([a-zA-Z]+)/);
    return match?.[1]?.toLowerCase() ?? 'unknown';
}


/**
 * Creates an error handler function for a specific item
 * @template ItemT - Type of the item being processed
 * @template ReturnT - Type of the expected return value
 * @param self - Instance of SeqPromiseClass
 * @param item - The item being processed when the error occurred
 * @returns A function that handles errors for the specific item
 */
function errorCallBack<ItemT, ReturnT>(self: SeqPromiseClass<ReturnT, ItemT>, item: ItemT): (reason: string | Error) => void {
    return function (reason: string | Error): void {
        self._errors.push({
            item,
            reason
        });
        if (self.errorCB) {
            self.errorCB(item, reason);
        }
    };
}

/**
 * Configure batch queue processing mode
 * @template ItemType - Type of items to process
 * @template ReturnType - Type of the return values
 * @param self - Instance of SeqPromiseClass to configure
 */
// function buildBatchQueue<ItemType, ReturnType>(self: SeqPromiseClass<ItemType, ReturnType>): void {
//
//     function secondary(item: ItemType) {
//         const p =  new Promise<ReturnType>(function (resolve, reject) {
//             return self.cb(item, resolve, reject, self);
//         });
//             p.then(response=> {
//                 self._responses.push(response);
//             })
//             .catch(errorCallBack(self, item));
//             return p;
//     }
//
//     const createAllPromise = function (items: Array<ItemType>) {
//         let pList: Array<Promise<ReturnType>> = [];
//         for (let i = 0; i < items.length; i++) {
//             pList.push(secondary(items[i]));
//         }
//         return Promise.all(pList);
//     };
//
//     const nextBatch = function (_start?: number, _size?: number) {
//         _start = _start || 0;
//         _size = _size || self.batchSize;
//         if (self._stopped) return;
//         // return new Promise<SeqPromResult<ItemType, ReturnType>>(res => {
//         return createAllPromise(self.list.splice(_start, _size));
//         // });
//     };
//     const loops = Math.ceil(self.list.length / self.poolSize);
//     for (let i = 0; i < loops; i++) {
//         self.promise = self.promise.then(nextBatch) as unknown as Promise<SeqPromResult<ItemType, ReturnType>>;
//     }
//     self.promise = self.promise
//         .then(() => {
//             if(self.finalCB) self.finalCB(self._errors, self._responses)
//         })
//         .then((): SeqPromResult<ItemType, ReturnType> => [self._errors, self._responses]);
// }

/**
 * Configure pool queue (streaming) processing mode
 * @template ItemType - Type of items to process
 * @template ReturnType - Type of the return values
 * @param self - Instance of SeqPromiseClass to configure
 */
function buildPoolQueue<ItemType, ReturnType>(self: SeqPromiseClass<ReturnType,ItemType>) {
    function _poolGenerator(): Promise<ReturnType | undefined> | undefined {
        const item = self.list.shift();
        if (!item) return;
        return createCBPromise(self, item)
            .then((response) => self._responses.push({
                item,
                result: response as ReturnType
            }))
            .catch(errorCallBack(self, item))
            .then(_poolGenerator);
    }

    function createCBPromise(self: SeqPromiseClass<ReturnType, ItemType>, item: ItemType) {
        return new Promise((resolve, reject) => {
            if (self._stopped) return void resolve(undefined);
            try {
                // Call the callback and capture its return value
                const result = self.cb(item, {
                    resolve,
                    reject,
                    self
                });
                // If the callback returns a Promise, handle it
                if (result instanceof Promise) {
                         return result
                             .then(value => resolve(value))
                            .catch(reason => errorCallBack(self, item)(reason));
                }
                else if (result !== undefined) {
                                 return resolve(result as ReturnType);
                             }
                // If not, we assume the callback will use resolve/reject directly
            } catch (error) {
                 //errorCallBack(self, item)(typeOf(error) === "error" ? (error as Error).message : String(error) );
                 reject(typeOf(error) === "error" ? (error as Error).message : String(error));
            }
            return;
            // return self.cb(item, {resolve, reject, self});
        });
    }

    self.promise =
        self.promise
            .then(function () {
                const pool: Array<Promise<ReturnType | undefined> | undefined> = [];

                for (let i = 0; i < self.size; i++) {
                    pool.push(_poolGenerator());
                }

                return Promise.all(pool);
            })
            .then(() => {
                if (self.finalCB) self.finalCB(self._errors, self._responses)
            })
            .then((): SeqPromResult<ItemType, ReturnType> => [self._errors, self._responses]);
}

type SeqPromResult<T, RT> = [Array<ItemError<T>>, Array<ItemSuccess<T, RT>>];

type MasterPromise<T = unknown, RT = unknown> = {
    resolver: Resolver<T, RT>;
    promise: Promise<SeqPromResult<T, RT>>;
}

/**
 * Creates a deferred promise with externally accessible resolver
 * @template ItemType - Type of items being processed
 * @template ReturnType - Type of return values
 * @returns Object containing both the promise and its resolver
 */
function createMasterPromise<ItemType, ReturnType>(): MasterPromise<ItemType, ReturnType> {
    let promise: Promise<SeqPromResult<ItemType, ReturnType>>;
    let resolver: Resolver<ItemType, ReturnType> = null as unknown as Resolver<ItemType, ReturnType>;


    promise = new Promise<SeqPromResult<ItemType, ReturnType>>(resolve => {
        resolver = resolve as Resolver<ItemType, ReturnType>;
    });

    return {
        resolver,
        promise,
    };
}

class SeqPromiseClass<ReturnType, ItemType, TOptions extends SeqPromOptionsSchema<ReturnType, ItemType> = SeqPromOptionsSchema<ReturnType, ItemType>> {
    list: Array<ItemType>;
    cb: TOptions["cb"];
    finalCB: TOptions["finalCB"];
    errorCB: TOptions["errorCB"];
    useBatch: boolean;
    size: number;
    promise: Promise<SeqPromResult<ItemType, ReturnType>>;
    _globalPromiseResolver: Resolver<ItemType, ReturnType>;
    _stopped: boolean;
    _errors: Array<ItemError<ItemType>>;
    _responses: Array<ItemSuccess<ItemType, ReturnType>>;

    /**
     * SeqPromise class processes items sequentially using promises
     * @template ItemType - Type of items in the list to process
     * @template ReturnType - Type returned by the callback
     *
     * @param options - The options for setting the chain
     * @param options.list - The list of items to iterate through asynchronously
     * @param options.cb - Function called for each item, returning a result or promise
     * @param options.size - Either - The size of "simulated" thread pool (default: 1)\n - size of the batch (default: 1)
     * @param options.autoStart - Will start processing immediately if true (default: false)
     * @param options.useBatch - Switches from Stream mode to batch (default: false)
     * @param options.context - Context to run functions in (this binding)
     * @param options.finalCB - Function called when all processing is complete
     * @param options.errorCB - Function called when an error occurs processing an item
     */

    constructor(options: SeqPromOptionsSchema<ReturnType, ItemType>) {

        if (typeOf(options.list) !== 'array') {
            throw new Error(`Expecting list to be type Array, found type ${typeOf(options.list)}`);
        }

        if (!(typeOf(options.cb) === 'function' || typeOf(options.cb) === 'asyncfunction')) {
            throw new Error(`Expecting cb to be type Function, found type ${typeOf(options.cb)}`);
        }

        this.list = options.list.slice() as Array<ItemType>;
        this.cb = options.cb;
        this.finalCB = options.finalCB || function (): void {
        };
        this.errorCB = options.errorCB || function (): void {
        };
        this.useBatch = isTrue(options.useBatch);
        this.size = options.size || 1;

        this.promise = Promise.resolve() as unknown as Promise<SeqPromResult<ItemType, ReturnType>>;
        this._globalPromiseResolver = () => {
        };
        this._stopped = false;
        this._errors = [];
        this._responses = [];

        if (options.context) {
            this.cb = options.cb.bind(options.context);
            this.finalCB = options.finalCB
                ? options.finalCB.bind(options.context)
                : function (): void {
                };
            this.errorCB = options.errorCB
                ? options.errorCB.bind(options.context)
                : function (): void {
                };
        }

        if (!options.useBatch && (options.size && options.size >= options.list.length)) {
            this.size = options.list.length;
        }

        let wrappedMasterPromise = createMasterPromise<ItemType, ReturnType>();
        this.promise = wrappedMasterPromise.promise;
        this._globalPromiseResolver = wrappedMasterPromise.resolver;

        //Batch
        if (options.useBatch)  throw new Error('Batch mode not yet implemented');
        //     buildBatchQueue(this);
        else buildPoolQueue(this);

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
        this._stopped = true;
    }
}

/**
 * Factory function to create a SeqPromise instance
 * @template T - Type of items in the list to process
 * @template RT - Type returned by the callback (default: any)
 *
 * @param options - Configuration options for sequential processing
 * @returns A configured SeqPromiseClass instance that can be started
 */
function SeqPromise<RT, T>(options: SeqPromOptionsSchema<RT, T>): SeqPromiseClass<RT, T> {
    return new SeqPromiseClass<RT, T>(options);
}

// trick borrowed from jQuery so we don't have to use the 'new' keyword
SeqPromise.prototype = SeqPromiseClass.prototype;

export default SeqPromise;
export {SeqPromise};
export type SeqPromise = typeof SeqPromise;
