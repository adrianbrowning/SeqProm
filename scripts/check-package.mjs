import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), 'seq-prom-package-'));

try {
    const packOutput = execFileSync(
        'npm',
        ['pack', '--ignore-scripts', '--json', '--pack-destination', temporaryRoot],
        {cwd: projectRoot, encoding: 'utf8'}
    );
    const [packResult] = JSON.parse(packOutput);
    const packedPaths = new Set(packResult.files.map(({path}) => path));

    for (const requiredPath of [
        'dist/index.js',
        'dist/index.cjs',
        'dist/index.d.ts',
        'dist/index.d.cts',
        'dist/require.cjs',
        'dist/require.d.cts',
        'LICENSE',
        'README.md'
    ]) {
        assert.ok(packedPaths.has(requiredPath), `package is missing ${requiredPath}`);
    }

    const manifest = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    const license = readFileSync(join(projectRoot, 'LICENSE'), 'utf8');
    assert.match(license, new RegExp(`^${manifest.license} License`));

    const consumerRoot = join(temporaryRoot, 'consumer');
    const tarballPath = join(temporaryRoot, packResult.filename);
    mkdirSync(consumerRoot);
    writeFileSync(join(consumerRoot, 'package.json'), JSON.stringify({private: true}));
    execFileSync(
        'npm',
        ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
        {cwd: consumerRoot, stdio: 'pipe'}
    );

    execFileSync(process.execPath, [
        '--input-type=module',
        '--eval',
        "import SeqProm, {SeqPromise} from 'seq-prom'; if (typeof SeqProm !== 'function' || SeqProm !== SeqPromise) process.exit(1);"
    ], {cwd: consumerRoot, stdio: 'pipe'});

    execFileSync(process.execPath, [
        '--eval',
        "const SeqProm = require('seq-prom'); if (typeof SeqProm !== 'function' || SeqProm !== SeqProm.default || SeqProm !== SeqProm.SeqPromise) process.exit(1);"
    ], {cwd: consumerRoot, stdio: 'pipe'});

    writeFileSync(join(consumerRoot, 'esm.mts'), `
import SeqProm, {SeqPromise} from 'seq-prom';
const processing = SeqProm<number, number>({list: [1], cb: item => item});
SeqPromise<number, number>({list: [1], cb: item => item});
processing.stop();
`);
    writeFileSync(join(consumerRoot, 'commonjs.cts'), `
import SeqProm = require('seq-prom');
const processing = SeqProm<number, number>({list: [1], cb: item => item});
SeqProm.SeqPromise<number, number>({list: [1], cb: item => item});
processing.stop();
`);
    execFileSync(join(projectRoot, 'node_modules', '.bin', 'tsc'), [
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--target', 'ES2022',
        '--module', 'NodeNext',
        '--moduleResolution', 'NodeNext',
        'esm.mts',
        'commonjs.cts'
    ], {cwd: consumerRoot, stdio: 'pipe'});
} finally {
    rmSync(temporaryRoot, {recursive: true, force: true});
}
