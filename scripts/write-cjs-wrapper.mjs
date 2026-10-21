import {readFile, writeFile} from 'node:fs/promises';

const wrapper = `'use strict';

const implementation = require('./index.cjs');
const SeqProm = implementation.default;

module.exports = SeqProm;
module.exports.default = SeqProm;
module.exports.SeqPromise = implementation.SeqPromise;
`;

const declaration = `import type {SeqPromController, SeqPromOptions} from './index.cjs';

declare function SeqProm<RT, T>(options: SeqPromOptions<RT, T>): SeqPromController<RT, T>;

declare namespace SeqProm {
    const SeqPromise: typeof SeqProm;
}

export = SeqProm;
`;

await writeFile(new URL('../dist/require.cjs', import.meta.url), wrapper);
await writeFile(new URL('../dist/require.d.cts', import.meta.url), declaration);

const manifestUrl = new URL('../package.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
manifest.main = './dist/require.cjs';
manifest.types = './dist/index.d.ts';
manifest.exports = {
    '.': {
        import: {
            types: './dist/index.d.ts',
            default: './dist/index.js'
        },
        require: {
            types: './dist/require.d.cts',
            default: './dist/require.cjs'
        }
    }
};
await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
