import test from 'node:test';
import assert from 'node:assert/strict';

import { createGasContext, loadScripts } from './helpers.mjs';

function loadAssertionContext() {
  const context = createGasContext();
  loadScripts(context, ['apps_script_tools/testing/TestAssertions.js']);
  return context;
}

test('astTestRunWithAssertions passes when assertions execute', () => {
  const context = loadAssertionContext();

  context.astTestRunWithAssertions(t => {
    t.ok(true);
    t.equal('a', 'a');
  }, { minAsserts: 2 });
});

test('astTestRunWithAssertions enforces minimum assertion count', () => {
  const context = loadAssertionContext();

  assert.throws(
    () => context.astTestRunWithAssertions(() => {}, { minAsserts: 1 }),
    /Expected at least 1 assertion/
  );
});

test('astTestRunWithAssertions supports deepEqual with stable object key ordering', () => {
  const context = loadAssertionContext();

  context.astTestRunWithAssertions(t => {
    t.deepEqual(
      { b: 2, a: { z: 1, y: 0 } },
      { a: { y: 0, z: 1 }, b: 2 }
    );
  });
});

test('astTestRunWithAssertions deepEqual distinguishes missing vs undefined keys', () => {
  const context = loadAssertionContext();

  assert.throws(
    () => context.astTestRunWithAssertions(t => {
      t.deepEqual({ a: undefined }, {});
    }),
    /Expected/
  );
});

test('astTestRunWithAssertions deepEqual treats NaN as equal', () => {
  const context = loadAssertionContext();

  context.astTestRunWithAssertions(t => {
    t.deepEqual({ value: Number.NaN }, { value: Number.NaN });
  });
});

test('astTestRunWithAssertions deepEqual treats Set values as order-insensitive', () => {
  const context = loadAssertionContext();

  context.astTestRunWithAssertions(t => {
    t.deepEqual(
      new Set([3, 1, 2]),
      new Set([1, 2, 3])
    );
  });
});

test('astTestRunWithAssertions deepEqual treats Map entries as order-insensitive', () => {
  const context = loadAssertionContext();

  context.astTestRunWithAssertions(t => {
    t.deepEqual(
      new Map([['a', 1], ['b', 2]]),
      new Map([['b', 2], ['a', 1]])
    );
  });
});

test('astTestRunWithAssertions deepEqual compares DataView bytes', () => {
  const context = loadAssertionContext();

  const left = new DataView(new Uint8Array([1, 2, 3]).buffer);
  const right = new DataView(new Uint8Array([1, 2, 4]).buffer);

  assert.throws(
    () => context.astTestRunWithAssertions(t => {
      t.deepEqual(left, right);
    }),
    /Expected/
  );
});

test('astTestRunWithAssertions deepEqual distinguishes sparse holes from explicit undefined', () => {
  const context = loadAssertionContext();

  assert.throws(
    () => context.astTestRunWithAssertions(t => {
      t.deepEqual([, 1], [undefined, 1]);
    }),
    /Expected/
  );
});

test('astTestRunWithAssertions failure messages handle circular values safely', () => {
  const context = loadAssertionContext();

  const left = {};
  left.self = left;

  const right = { flag: true };
  right.self = right;

  assert.throws(
    () => context.astTestRunWithAssertions(t => {
      t.deepEqual(left, right);
    }),
    error => error && error.name === 'AstTestAssertionError'
  );
});

test('astTestRunWithAssertions supports async test callbacks', async () => {
  const context = loadAssertionContext();

  await context.astTestRunWithAssertions(async t => {
    await Promise.resolve();
    t.ok(true);
    t.match('ast-tools', /^ast/);
  }, { minAsserts: 2 });
});
