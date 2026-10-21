# Coding Standards

## Asynchronous tests

- Await the operation under test and make outcome assertions after it settles.
  Assertions inside callbacks must be paired with an assertion that the callback
  ran.
- Test concurrency with controlled promises or barriers. Keep elapsed-time
  comparisons in benchmarks, not correctness tests.

## Generated and published files

- Keep `src/index.ts` as the only scheduler implementation. Generate package
  artifacts during `pnpm build`; do not maintain parallel implementations by
  hand.
- Exercise both ESM and CommonJS exports through the packed tarball before a
  release.
