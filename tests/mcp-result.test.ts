/**
 * parseMcpResult unit tests (F-021)
 *
 * Run:
 *   npx tsx tests/mcp-result.test.ts
 *
 * A tool result that is purely a business error envelope ({error} string or {code,message} object)
 * must be surfaced as an error (ok:false), not returned as ok:true data.
 */

import assert from 'node:assert/strict';
import { parseMcpResult } from '../src/core/mcp.ts';
import { PermissionError } from '../src/core/errors.ts';

let pass = 0, fail = 0;
function test(name: string, fn: () => void) {
  try { fn(); pass++; process.stdout.write(`  ✓ ${name}\n`); }
  catch (e) { fail++; process.stdout.write(`  ✗ ${name}\n    ${e instanceof Error ? e.message : String(e)}\n`); }
}
const txt = (o: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(o) }] });
const failedTxt = (text: string) => ({
  content: [{ type: 'text' as const, text }],
  isError: true,
});

process.stdout.write('\nparseMcpResult tests\n');

// error envelopes → throw (ok:false)
test('object error {code,message} (permission) → PermissionError', () => {
  assert.throws(
    () => parseMcpResult(txt({ error: { code: 'AUTH_ERROR', message: 'DATA_AUTH_SCHEMA_NO_AUTH' } })),
    (e: Error) => e instanceof PermissionError && /DATA_AUTH_SCHEMA_NO_AUTH/.test(e.message),
  );
});
test('string error (non-permission) → Error (not PermissionError)', () => {
  assert.throws(
    () => parseMcpResult(txt({ error: 'something failed' })),
    (e: Error) => !(e instanceof PermissionError) && /something failed/.test(e.message),
  );
});
test('MCP isError with plain exception text → Error', () => {
  assert.throws(
    () => parseMcpResult(failedTxt('java.lang.NullPointerException\n\tat SqlIdeHelper.exchangeConfig(SqlIdeHelper.java:194)')),
    (e: Error) => !(e instanceof PermissionError) && /NullPointerException/.test(e.message),
  );
});
test('MCP isError without text content still fails', () => {
  assert.throws(
    () => parseMcpResult({ content: [], isError: true }),
    (e: Error) => /MCP tool call failed/.test(e.message),
  );
});
test('MCP isError with success:false envelope preserves code and message', () => {
  assert.throws(
    () => parseMcpResult(failedTxt(JSON.stringify({
      success: false,
      errorCode: 'TABLE_COLUMNS_FAILED',
      message: 'Unable to inspect table columns',
    }))),
    (e: Error) => /TABLE_COLUMNS_FAILED: Unable to inspect table columns/.test(e.message),
  );
});
test('success:false envelope is a failure even without MCP isError', () => {
  assert.throws(
    () => parseMcpResult(txt({
      success: false,
      error_code: 'TABLE_COLUMNS_FAILED',
      message: 'Unable to inspect table columns',
    })),
    (e: Error) => /TABLE_COLUMNS_FAILED: Unable to inspect table columns/.test(e.message),
  );
});

// legit results → returned unchanged (compare by value; safeJsonParse yields null-prototype objects)
const eq = (a: unknown, b: unknown) => assert.equal(JSON.stringify(a), JSON.stringify(b));
test('normal data object → returned', () => {
  eq(parseMcpResult(txt({ data: { items: [1, 2] } })), { data: { items: [1, 2] } });
});
test('array result → returned', () => {
  eq(parseMcpResult(txt([{ a: 1 }])), [{ a: 1 }]);
});
test('success:true alongside error → NOT treated as failure', () => {
  eq(parseMcpResult(txt({ success: true, error: { message: 'partial' } })), { success: true, error: { message: 'partial' } });
});
test('empty/null error → not a failure', () => {
  eq(parseMcpResult(txt({ error: '' })), { error: '' });
  eq(parseMcpResult(txt({ error: null })), { error: null });
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
