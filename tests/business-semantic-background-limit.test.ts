import assert from 'node:assert/strict';
import { executeCapabilityWithEnvelope, CapabilityGatewayError } from '../src/core/capability-api.js';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.js';
const host = 'https://background-limit.example.test';
const previousFetch = globalThis.fetch;
setCliTokenManual('synthetic-test', host);
let captured = '';
globalThis.fetch = (async (url, options) => {
  const input = JSON.parse(String(options?.body)).input;
  captured = input.markdown || '';
  const reading = String(url).includes('background.get/');
  const excessive = !reading && captured.length > 5000;
  return new Response(JSON.stringify(excessive
    ? { ok: false, error: { code: 'SEMANTIC_BACKGROUND_INVALID', message: 'Background must contain at most 5000 characters; shorten it before saving or publishing' } }
    : { ok: true, data: { markdown: reading ? 'x'.repeat(5001) : captured } }), { status: excessive ? 422 : 200 });
}) as typeof fetch;
try {
  for (const project_id of [0, 6]) {
    const capability = 'business_semantics.background.draft_save';
    const result = await executeCapabilityWithEnvelope(host, 'analysis', capability, { project_id, markdown: 'x'.repeat(5000), expected_revision: 1, request_id: 'save' });
    assert.equal((result.data as {markdown: string}).markdown.length, 5000);
    await assert.rejects(() => executeCapabilityWithEnvelope(host, 'analysis', capability, { project_id, markdown: 'x'.repeat(5001), expected_revision: 1, request_id: 'save' }), (error: Error) => {
      assert.ok(error instanceof CapabilityGatewayError);
      assert.match(error.message, /5000/);
      return true;
    });
    assert.equal(captured.length, 5001, 'The CLI never truncates input to make a write succeed.');
    const legacy = await executeCapabilityWithEnvelope(host, 'analysis', 'business_semantics.background.get', {project_id});
    assert.equal((legacy.data as {markdown: string}).markdown.length, 5001, 'Legacy reads remain complete.');
  }
  console.log('Company/project background CLI transport preserves limits, structured errors and legacy reads.');
} finally { globalThis.fetch = previousFetch; clearCliToken(host); }
