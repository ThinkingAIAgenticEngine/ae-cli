import assert from 'node:assert/strict';
import test from 'node:test';
import { status } from '../src/commands/te-kb/status.ts';

const context = (values = {}) => ({ str: name => values[name] ?? '', host: () => 'https://example.test' });

test('exact compile status forwards an optional run ID without changing legacy requests', () => {
  const old = status.dryRun(context({ name: 'KB', scope: 'company' }));
  assert.deepEqual(old.body, { name: 'KB', scope: 'company' });
  const exact = status.dryRun(context({ name: 'KB', scope: 'company', 'run-id': 'run-1' }));
  assert.deepEqual(exact.body, { name: 'KB', scope: 'company', runId: 'run-1' });
  assert.equal(exact.url, old.url);
  assert.equal(status.flags.find(flag => flag.name === 'run-id')?.required, false);
});

test('blank explicit run IDs are rejected instead of becoming aggregate polling', () => {
  assert.throws(() => status.validate(context({ name: 'KB', 'run-id': ' ' })), /run-id/);
});
