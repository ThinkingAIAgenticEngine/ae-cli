import assert from 'node:assert/strict';
import { captureThingsAgentContext } from './fixtures/things-agent-context.js';

for (const mode of ['claude', 'codex', 'none'] as const) {
  const rows = await captureThingsAgentContext(mode);
  const things = rows.filter((row) => row.path.includes('/things/v1/'));
  assert.equal(things.length, 6);
  for (const row of things) {
    assert.equal(row.hasCliToken, true);
    assert.equal(row.hasAuthorization, false);
    assert.equal(row.agentClient, mode === 'none' ? null : mode === 'claude' ? 'claude_code' : 'codex');
    if (row.body) assert.equal('client_context' in row.body, false, `${mode} ${row.method} ${row.path} must retain the strict business body`);
  }
  const capability = rows.find((row) => row.path.includes('/capabilities/'));
  assert.ok(capability?.body);
  assert.deepEqual(capability.body.input, { project_id: 1 });
  assert.equal('client_context' in capability.body, mode !== 'none');
}
console.log('Things Agent context contract: 3 runtime modes and all write methods passed');
