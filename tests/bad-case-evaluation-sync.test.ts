import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { unwrapOutputData } from '../src/framework/output.js';
import { badCaseReview, badCaseSyncEvaluation } from '../src/commands/te-analysis/bad-case/index.js';
import type { RuntimeContext } from '../src/framework/types.js';

const host = 'https://bad-case-sync-test.invalid';
const originalFetch = globalThis.fetch;
const originalSession = process.env.AE_EVAL_ACCESS_TOKEN;
const remoteId = '0190a000-0000-7000-8000-000000000001';
setCliTokenManual('synthetic-bad-case-sync-token', host);
process.env.AE_EVAL_ACCESS_TOKEN = 'synthetic-evaluation-session';
const initial = { id: '9007199254741001', version: '1', review_state: 'APPROVED',
  evidence_snapshot: { question: 'q', answer: 'a' }, ai_summary: { reason: 'r' }, evaluation: { state: 'PENDING' } };
let current: any;
let calls: { path: string; body: any }[];
let failAE: boolean;
let failReport: boolean;
const flags: Record<string, string> = { 'project-id': '5', 'item-id': initial.id, version: '0', decision: 'APPROVE', 'client-request-id': 'same-review' };
const ctx = { host: () => host, str: (key: string) => flags[key] || '' } as RuntimeContext;
beforeEach(() => {
  current = structuredClone(initial); calls = []; failAE = false; failReport = false; flags.decision = 'APPROVE';
  globalThis.fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
    if (path.endsWith('/cli/token/renew')) return response({ return_code: 0 });
    calls.push({ path, body });
    if (path.endsWith('/agent/evaluation/session')) return response({ session_token: 'synthetic-evaluation-session' });
    if (path.startsWith('/agenteval/')) {
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer synthetic-evaluation-session');
      if (failAE) return response({ error: { code: 'FORBIDDEN', message: 'Denied' } }, 403);
      return response({ case_id: body.active ? remoteId : '', source_version: body.version });
    }
    assert.equal(body.input.project_id, 5);
    if (path.endsWith('evaluation_config/execute')) return response({ ok: true, data: { initialized: true, te_project_id: '5', dataset_id: 'dataset' } });
    if (path.endsWith('evaluation_result/execute')) {
      if (failReport) return response({ error: { code: 'UNAVAILABLE' } }, 503);
      current = { ...current, evaluation: body.input };
    }
    return response({ ok: true, data: current, meta: { request_id: 'test-request' } });
  };
});
after(() => {
  globalThis.fetch = originalFetch;
  if (originalSession === undefined) delete process.env.AE_EVAL_ACCESS_TOKEN;
  else process.env.AE_EVAL_ACCESS_TOKEN = originalSession;
  clearCliToken(host);
});
test('review directly synchronizes AE after Common saves and then records the result', async () => {
  const result = unwrapOutputData(await badCaseReview.execute(ctx));
  assert.equal(result.evaluation.state, 'SYNCED');
  assert.deepEqual(calls.map(c => c.path), [
    '/api/cli/analysis/v1/capabilities/analysis.bad_case.review/execute',
    '/api/cli/analysis/v1/capabilities/analysis.bad_case.evaluation_config/execute',
    `/agenteval/api/v1/semantic-evaluation/datasets/dataset/cases/${initial.id}`,
    '/api/cli/analysis/v1/capabilities/analysis.bad_case.evaluation_result/execute',
  ]);
  assert.equal(calls[2].body.active, true);
  assert.equal(calls[3].body.input.version, '1');
});
test('failed AE synchronization retains the review and exposes a retryable error', async () => {
  failAE = true;
  const result = unwrapOutputData(await badCaseReview.execute(ctx));
  assert.equal(result.review_state, 'APPROVED');
  assert.equal(result.evaluation.state, 'ERROR');
  assert.equal(result.evaluation.error_code, 'FORBIDDEN');
  failAE = false;
  assert.equal((await badCaseSyncEvaluation.execute(ctx)).evaluation.state, 'SYNCED');
});
test('retry fetches the latest revoked state even with framework output metadata', async () => {
  current = { ...current, review_state: 'PENDING', version: '2' };
  assert.equal((await badCaseSyncEvaluation.execute(ctx)).evaluation.state, 'SYNCED');
  assert.match(calls[0].path, /bad_case.get\/execute$/);
  assert.equal(calls[2].body.active, false);
  assert.equal(calls[2].body.version, 2);
});
test('lost result acknowledgement remains pending and can be retried', async () => {
  failReport = true;
  assert.equal(unwrapOutputData(await badCaseReview.execute(ctx)).evaluation.state, 'PENDING');
  failReport = false;
  assert.equal((await badCaseSyncEvaluation.execute(ctx)).evaluation.state, 'SYNCED');
});
test('older Common responses retain review-only compatibility', async () => {
  delete current.evaluation;
  assert.equal(unwrapOutputData(await badCaseReview.execute(ctx)).review_state, 'APPROVED');
  assert.equal(calls.length, 1);
});
test('dry-run never calls AE or writes a synchronization result', async () => {
  await badCaseReview.dryRun!(ctx);
  assert.equal(calls.length, 1);
  assert.match(calls[0].path, /bad_case.review\/dry-run$/);
});

test('sandbox authentication uses the command project instead of an ambient project', async () => {
  const sandbox = process.env.SANDBOX_RUNTIME_ROOT;
  const project = process.env.AE_EVAL_TE_PROJECT_ID;
  const session = process.env.AE_EVAL_ACCESS_TOKEN;
  process.env.SANDBOX_RUNTIME_ROOT = '/tmp/bad-case-sync-empty-sandbox';
  process.env.AE_EVAL_TE_PROJECT_ID = '99';
  delete process.env.AE_EVAL_ACCESS_TOKEN;
  try {
    assert.equal(unwrapOutputData(await badCaseReview.execute(ctx)).evaluation.state, 'SYNCED');
    assert.deepEqual(calls.find(c => c.path.endsWith('/agent/evaluation/session'))?.body, { te_project_id: '5' });
  } finally {
    for (const [key, value] of Object.entries({ SANDBOX_RUNTIME_ROOT: sandbox, AE_EVAL_TE_PROJECT_ID: project, AE_EVAL_ACCESS_TOKEN: session })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('revoking a never-approved rejection saves Common only and preserves an omitted supplement', async () => {
  flags.decision = 'REVOKE';
  current = { ...current, review_state: 'PENDING', version: '2', evaluation: { state: 'NONE' }, review: { supplement: 'Keep the evidence' } };
  const result = unwrapOutputData(await badCaseReview.execute(ctx));
  assert.equal(result.review_state, 'PENDING');
  assert.equal(result.review.supplement, 'Keep the evidence');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.input.decision, 'REVOKE');
  assert.equal(Object.hasOwn(calls[0].body.input, 'supplement'), false);
});
test('reopened rejection with approval history retries removal without adding a case', async () => {
  flags.decision = 'REVOKE';
  current = { ...current, review_state: 'PENDING', version: '4' };
  failAE = true;
  const result = unwrapOutputData(await badCaseReview.execute(ctx));
  assert.equal(result.review_state, 'PENDING');
  assert.equal(result.evaluation.state, 'ERROR');
  assert.equal(calls[2].body.active, false);
  failAE = false;
  assert.equal((await badCaseSyncEvaluation.execute(ctx)).evaluation.state, 'SYNCED');
  assert.equal(calls.filter(c => c.path.startsWith('/agenteval/')).every(c => c.body.active === false), true);
});
