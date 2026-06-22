/**
 * ae-cli data query limit hard cap / dual-layer limit guard unit tests
 *
 * Run:
 *   npx tsx tests/query-limit.test.ts
 */

import assert from 'node:assert/strict';
import {
  assertLimitWithinCap,
  assertSqlLimitConsistent,
  DEFAULT_QUERY_LIMIT,
  extractTrailingSqlLimit,
  findSqlInQp,
  MAX_QUERY_LIMIT,
  resolveSqlAwareLimit,
} from '../src/commands/te-analysis/shared.ts';

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    pass += 1;
    console.log(`  ok - ${name}`);
  } catch (err) {
    fail += 1;
    console.error(`  FAIL - ${name}`);
    console.error(`        ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log('extractTrailingSqlLimit');
test('plain trailing LIMIT', () => assert.equal(extractTrailingSqlLimit('select * from t limit 100'), 100));
test('LIMIT n OFFSET m -> n', () => assert.equal(extractTrailingSqlLimit('SELECT * FROM t LIMIT 100 OFFSET 200'), 100));
test('MySQL "LIMIT offset, count" -> count', () => assert.equal(extractTrailingSqlLimit('select * from t limit 200, 100'), 100));
test('trailing semicolon and whitespace', () => assert.equal(extractTrailingSqlLimit('select * from t limit 50 ;\n'), 50));
test('no LIMIT -> undefined', () => assert.equal(extractTrailingSqlLimit('select * from t'), undefined));
test('subquery LIMIT is not trailing -> undefined', () => assert.equal(extractTrailingSqlLimit('select * from (select x from y limit 5) z'), undefined));

console.log('findSqlInQp');
test('top-level sql field', () => assert.equal(findSqlInQp({ sql: 'SELECT a FROM b LIMIT 10' }), 'SELECT a FROM b LIMIT 10'));
test('nested sql field', () => assert.equal(findSqlInQp({ eventView: { sqlQuery: 'select x from y' } }), 'select x from y'));
test('no sql-looking string -> undefined', () => assert.equal(findSqlInQp({ foo: 'bar', n: 3 }), undefined));

console.log('assertLimitWithinCap');
test('undefined passes', () => assert.doesNotThrow(() => assertLimitWithinCap(undefined, 'limit')));
test('1 passes', () => assert.doesNotThrow(() => assertLimitWithinCap(1, 'limit')));
test('MAX passes', () => assert.doesNotThrow(() => assertLimitWithinCap(MAX_QUERY_LIMIT, 'limit')));
test('0 throws', () => assert.throws(() => assertLimitWithinCap(0, 'limit')));
test('MAX+1 throws', () => assert.throws(() => assertLimitWithinCap(MAX_QUERY_LIMIT + 1, 'limit')));
test('non-integer throws', () => assert.throws(() => assertLimitWithinCap(1.5, 'limit')));

console.log('assertSqlLimitConsistent');
test('no provided limit -> no throw', () => assert.doesNotThrow(() => assertSqlLimitConsistent({ sql: 'select * from t limit 100' }, undefined)));
test('equal values -> no throw', () => assert.doesNotThrow(() => assertSqlLimitConsistent({ sql: 'select * from t limit 100' }, 100)));
test('mismatch -> throw', () => assert.throws(() => assertSqlLimitConsistent({ sql: 'select * from t limit 100' }, 50)));
test('sql without LIMIT -> no throw', () => assert.doesNotThrow(() => assertSqlLimitConsistent({ sql: 'select * from t' }, 50)));
test('no sql in qp -> no throw', () => assert.doesNotThrow(() => assertSqlLimitConsistent({ foo: 'bar' }, 50)));

console.log('resolveSqlAwareLimit');
test('explicit limit wins', () => assert.equal(resolveSqlAwareLimit(50, 'sql', { sql: 'select * from t limit 100' }), 50));
test('non-sql model defaults', () => assert.equal(resolveSqlAwareLimit(undefined, 'event', {}), DEFAULT_QUERY_LIMIT));
test('sql with trailing LIMIT defers (undefined)', () => assert.equal(resolveSqlAwareLimit(undefined, 'sql', { sql: 'select * from t limit 100' }), undefined));
test('sql without LIMIT defaults', () => assert.equal(resolveSqlAwareLimit(undefined, 'sql', { sql: 'select * from t' }), DEFAULT_QUERY_LIMIT));
test('sql model but no sql string defaults', () => assert.equal(resolveSqlAwareLimit(undefined, 'sql', { foo: 'bar' }), DEFAULT_QUERY_LIMIT));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
