/**
 * safeJsonParse numeric-contract regression tests.
 *
 * Run:
 *   npx tsx tests/json-utils.test.ts
 */

import assert from 'node:assert/strict';
import { safeJsonParse } from '../src/core/json-utils.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    process.stdout.write(`  OK: ${name}\n`);
  } catch (error) {
    failed++;
    process.stdout.write(`  FAIL: ${name}\n    ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

process.stdout.write('\nsafeJsonParse numeric contract\n');

test('keeps safe integers as numbers even when the token has 16 digits', () => {
  const parsed = safeJsonParse('{"value":9007199254740991}');
  assert.equal(parsed.value, Number.MAX_SAFE_INTEGER);
  assert.equal(typeof parsed.value, 'number');
});

test('keeps unsafe integers as exact strings', () => {
  const parsed = safeJsonParse('{"value":1524788894514548736}');
  assert.equal(parsed.value, '1524788894514548736');
  assert.equal(typeof parsed.value, 'string');
});

test('handles positive and negative safe-integer boundaries', () => {
  const parsed = safeJsonParse(
    '{"maxSafe":9007199254740991,"aboveMax":9007199254740992,'
      + '"minSafe":-9007199254740991,"belowMin":-9007199254740992}',
  );
  assert.equal(parsed.maxSafe, Number.MAX_SAFE_INTEGER);
  assert.equal(parsed.aboveMax, '9007199254740992');
  assert.equal(parsed.minSafe, Number.MIN_SAFE_INTEGER);
  assert.equal(parsed.belowMin, '-9007199254740992');
});

test('keeps long decimal values as numbers', () => {
  const parsed = safeJsonParse('{"value":5401.925531914893}');
  assert.equal(parsed.value, Number('5401.925531914893'));
  assert.equal(typeof parsed.value, 'number');
});

test('normalizes nested numeric values without changing numeric strings', () => {
  const parsed = safeJsonParse(
    '{"values":[2454.39892578125,9007199254740992,"9007199254740992"]}',
  );
  assert.equal(typeof parsed.values[0], 'number');
  assert.equal(parsed.values[1], '9007199254740992');
  assert.equal(parsed.values[2], '9007199254740992');
});

test('keeps exponent and decimal tokens as numbers', () => {
  const parsed = safeJsonParse(
    '{"large":9.007199254740993e15,"fraction":1.234567890123456E-20,'
      + '"decimalInteger":9007199254740993.0,"negative":-5401.925531914893}',
  );
  assert.equal(typeof parsed.large, 'number');
  assert.equal(typeof parsed.fraction, 'number');
  assert.equal(typeof parsed.decimalInteger, 'number');
  assert.equal(typeof parsed.negative, 'number');
});

test('supports top-level numeric primitives', () => {
  assert.equal(safeJsonParse('9007199254740992'), '9007199254740992');
  assert.equal(typeof safeJsonParse('5401.925531914893'), 'number');
});

test('preserves parser object safety and rejects malformed input', () => {
  const parsed = safeJsonParse('{"flag":true,"empty":null}');
  assert.equal(Object.getPrototypeOf(parsed), null);
  assert.equal(parsed.flag, true);
  assert.equal(parsed.empty, null);
  assert.throws(
    () => safeJsonParse('{"__proto__":{}}'),
    (error: any) => /forbidden prototype property/.test(error?.message),
  );
  assert.throws(
    () => safeJsonParse('{"constructor":{}}'),
    (error: any) => /forbidden constructor property/.test(error?.message),
  );
  assert.throws(() => safeJsonParse('{"value":}'));
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
