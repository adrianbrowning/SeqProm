import assert from 'node:assert';
import {describe, it, mock} from 'node:test';
import SeqProm from '../src/index.ts';

async function withTimeout<T>(promise: Promise<T>, milliseconds = 100) {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeout = setTimeout(() => reject(new Error('processing timed out')), milliseconds);
            })
        ]);
    } finally {
        if (timeout !== undefined) clearTimeout(timeout);
    }
}

describe('SeqProm regression tests', async () => {
    await it('processes every falsy item in pool mode', async () => {
        const list = [0, false, '', null] as const;

        const [errors, responses] = await SeqProm<string, typeof list[number]>({
            list,
            cb: item => String(item),
            autoStart: true
        }).promise;

        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(responses, [
            {item: 0, result: '0'},
            {item: false, result: 'false'},
            {item: '', result: ''},
            {item: null, result: 'null'}
        ]);
    });

    await it('collects a rejection from a returned promise without hanging', async () => {
        const [errors, responses] = await withTimeout(SeqProm<number, number>({
            list: [1, 2, 3],
            cb: async item => {
                if (item === 2) throw new Error('no two');
                return item;
            },
            autoStart: true
        }).promise);

        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].item, 2);
        assert.match(String(errors[0].reason), /no two/);
        assert.deepStrictEqual(responses.map(({item}) => item), [1, 3]);
    });

    await it('collects batch rejections and continues with later batches', async () => {
        const processed: number[] = [];
        const [errors, responses] = await SeqProm<number, number>({
            list: [1, 2, 3, 4],
            size: 2,
            useBatch: true,
            cb: async item => {
                processed.push(item);
                if (item === 2) throw new Error('no two');
                return item;
            },
            autoStart: true
        }).promise;

        assert.deepStrictEqual(processed, [1, 2, 3, 4]);
        assert.strictEqual(errors.length, 1);
        assert.strictEqual(errors[0].item, 2);
        assert.deepStrictEqual(responses.map(({item}) => item), [1, 3, 4]);
    });

    await it('calls finalCB exactly once in batch mode', async () => {
        const finalCB = mock.fn();

        await SeqProm({
            list: [1, 2, 3],
            size: 2,
            useBatch: true,
            cb: item => item,
            finalCB,
            autoStart: true
        }).promise;

        assert.strictEqual(finalCB.mock.calls.length, 1);
    });

    await it('calls finalCB exactly once in pool mode', async () => {
        const finalCB = mock.fn();

        await SeqProm({
            list: [1, 2, 3],
            size: 2,
            cb: item => item,
            finalCB,
            autoStart: true
        }).promise;

        assert.strictEqual(finalCB.mock.calls.length, 1);
    });

    await it('does not consume or record queued items after stop', async () => {
        const processed: number[] = [];

        const [errors, responses] = await SeqProm<number, number>({
            list: [1, 2, 3],
            cb(item, {self}) {
                processed.push(item);
                self.stop();
                return item;
            },
            autoStart: true
        }).promise;

        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(processed, [1]);
        assert.deepStrictEqual(responses, [{item: 1, result: 1}]);
    });

    await it('allows already-started pool operations to settle after stop', async () => {
        const processed: number[] = [];

        const [errors, responses] = await SeqProm<number, number>({
            list: [1, 2, 3],
            size: 2,
            cb(item, {resolve, self}) {
                processed.push(item);
                if (item === 2) self.stop();
                setTimeout(() => resolve(item), 1);
            },
            autoStart: true
        }).promise;

        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(processed, [1, 2]);
        assert.deepStrictEqual(responses.map(({item}) => item), [1, 2]);
    });

    await it('records only the first settlement from a callback', async () => {
        const [errors, responses] = await SeqProm<number, number>({
            list: [1],
            cb(item, {resolve, reject}) {
                resolve(item);
                reject('late rejection');
                resolve(999);
            },
            autoStart: true
        }).promise;

        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(responses, [{item: 1, result: 1}]);
    });

    await it('assimilates returned thenables', async () => {
        const resolved = Promise.resolve(42);
        const thenable: PromiseLike<number> = {
            then: resolved.then.bind(resolved)
        };

        const [errors, responses] = await withTimeout(SeqProm<number, number>({
            list: [1],
            cb: () => thenable,
            autoStart: true
        }).promise);

        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(responses, [{item: 1, result: 42}]);
    });

    await it('binds a falsy callback context', async () => {
        let observedContext: unknown;

        await SeqProm({
            list: [1],
            context: false,
            cb: function (item) {
                observedContext = this;
                return item;
            },
            autoStart: true
        }).promise;

        assert.strictEqual(observedContext, false);
    });

    await it('rejects invalid pool or batch sizes', () => {
        for (const size of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
            assert.throws(
                () => SeqProm({list: [1], cb: item => item, size}),
                {name: 'RangeError', message: 'size must be a positive integer'}
            );
        }
    });

    await it('keeps successful results in completion order', async () => {
        const resolvers = new Map<number, (value: number) => void>();
        const [errors, responses] = await SeqProm<number, number>({
            list: [1, 2, 3],
            size: 3,
            cb(item, {resolve}) {
                resolvers.set(item, resolve);

                if (resolvers.size === 3) {
                    resolvers.get(3)?.(3);
                    queueMicrotask(() => {
                        resolvers.get(2)?.(2);
                        queueMicrotask(() => resolvers.get(1)?.(1));
                    });
                }
            },
            autoStart: true
        }).promise;

        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(responses.map(({item}) => item), [3, 2, 1]);
    });
});
