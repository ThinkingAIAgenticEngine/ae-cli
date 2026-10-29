import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RuntimeContext } from '../src/framework/types.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { metadataGovernanceRecommendationExport as exportCommand, metadataGovernanceRecommendationRunUpdate as update } from '../src/commands/te-analysis/meta/governance-recommendation/index.js';
const host = 'https://recommendation-run.example.com';
const context = (values: Record<string, unknown>) => ({
  has: (key: string) => Object.hasOwn(values, key),
  str: (key: string) => values[key] === undefined ? '' : String(values[key]),
  bool: (key: string) => values[key] === true,
  num: (key: string) => Number(values[key]), json: (key: string) => values[key], host: () => host,
}) as RuntimeContext;
test('optional tracking preserves legacy payload and maps exact run identity and terminal status', async () => {
  const original = globalThis.fetch;
  const calls: { url: string; body: any }[] = [];
  setCliTokenManual('test-run-token', host);
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body || '{}')) });
    return new Response(JSON.stringify({ ok: true, data: { status: 'RUNNING' } }));
  };
  try {
    await exportCommand.execute(context({ 'project-id': 5 }));
    await exportCommand.execute(context({ 'project-id': 5, 'track-run': true, 'run-id': 'rec_1' }));
    await update.execute(context({ 'project-id': 5, 'run-id': 'rec_1', status: 'FAILED', reason: 'Interpretation failed' }));
    const execute = calls.filter(call => call.url.endsWith('/execute'));
    assert.equal(execute.length, 3);
    assert.deepEqual(execute[0].body.input, { project_id: 5 });
    assert.deepEqual(execute[1].body.input, { project_id: 5, track_run: true, run_id: 'rec_1' });
    assert.deepEqual(execute[2].body.input, { project_id: 5, run_id: 'rec_1', status: 'FAILED', reason: 'Interpretation failed' });
    assert.match(execute[2].url, /metadata.governance_recommendation.run_update/);
    const count = calls.length;
    await assert.rejects(() => exportCommand.execute(context({ 'project-id': 5, 'run-id': 'rec_1' })), /track-run/);
    await assert.rejects(() => update.execute(context({ 'project-id': 5, 'run-id': 'rec_1', status: 'INVALID' })), /status/);
    assert.equal(calls.length, count);
  } finally { globalThis.fetch = original; clearCliToken(host); }
});
