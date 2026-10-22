import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scenarioInput, scenarioCollect, scenarioAppend } from '../src/commands/te-analysis/scenario/index.js';
import { runWithCliAgentContext } from '../src/core/cli-agent-context.js';
import { executeCapability } from '../src/core/capability-api.js';
import { clearCliTokenCache } from '../src/core/cli-token.js';
import { PermissionError } from '../src/core/errors.js';
import { unwrapOutputData } from '../src/framework/output.js';
import type { RuntimeContext } from '../src/framework/types.js';

const queryPath = [{ capability_id: 'analysis.report_data.run', invocation_id: 'inv-1', purpose: 'Compare weekly users.' }];
function context(overrides: Record<string, unknown> = {}): RuntimeContext {
  const flags: Record<string, unknown> = { question: 'Compare weekly users.', answer: 'Users fell 12%.', 'query-path': queryPath, 'project-id': 1, ...overrides };
  return { str: (key) => String(flags[key] ?? ''), json: (key) => flags[key], optionalNum: (key) => flags[key] as number | undefined } as RuntimeContext;
}
await test('Collect preserves ordered call references and exact answer without query results or self-rating', async () => {
  await runWithCliAgentContext({ agent_session_id: 's1', agent_turn_id: 'q1' }, async () => {
    const path = [{ capability_id: 'analysis.report.get', client_request_id: 'request-1' }, ...queryPath,
      { capability_id: 'analysis.adhoc.run', invocation_id: 'inv-2' }];
    const input = scenarioInput(context({ 'query-path': path }));
    assert.equal(input.question_id, 'q1');
    assert.equal(input.answer_id, 'answer:q1');
    assert.equal(input.answer, 'Users fell 12%.');
    assert.deepEqual(input.query_path, path);
    assert.equal(input.evidence, undefined);
    assert.equal(input.result, undefined);
    assert.equal(input.question_id, scenarioInput(context({ answer: 'Reworded answer.' })).question_id);
    for (const path of [[], Array(65).fill(queryPath[0]),
      [{ capability_id: 'analysis.report.get', invocation_id: 'metadata-only' }],
      [{ capability_id: 'analysis.report_data.run' }],
      [{ ...queryPath[0], rating: 'good' }], [{ ...queryPath[0], data: { users: [1000, 880] } }],
      [{ ...queryPath[0], input: { report_ids: [901] } }], [{ ...queryPath[0], error: 'Query failed.' }],
      [{ ...queryPath[0], invocation_id: 2 }], [{ ...queryPath[0], purpose: 'x'.repeat(257) }],
      [{ ...queryPath[0], invocation_id: ' ' }], [{ capability_id: 'analysis.scenario.collect', invocation_id: 'self' }, ...queryPath],
      Array(64).fill({ ...queryPath[0], purpose: 'x'.repeat(256), invocation_id: 'x'.repeat(191) })]) {
      assert.throws(() => scenarioInput(context({ 'query-path': path })));
    }
    for (const overrides of [{ answer: ' ' }, { 'project-id': 1.5 }]) {
      assert.throws(() => scenarioInput(context(overrides)));
    }
  });
});
await test('Feedback and revisions reuse the original scenario and preserve the targeted answer', async () => {
  await runWithCliAgentContext({ agent_session_id: 's1', agent_turn_id: 't2' }, async () => {
    const flags = { 'question-id': 'q1', 'entry-type': 'user_feedback', 'target-answer-id': 'answer:q1', text: 'This number is wrong.', 'query-path': undefined };
    const feedback = scenarioInput(context(flags), true);
    assert.equal(feedback.question_id, 'q1');
    assert.equal(feedback.target_answer_id, 'answer:q1');
    assert.equal(feedback.text, 'This number is wrong.');
    assert.equal(feedback.entry_id, 't2:user_feedback');
    assert.equal(feedback.query_path, undefined);
    assert.equal(feedback.entry_id, scenarioInput(context({ ...flags, text: 'Changed words.' }), true).entry_id);
    assert.throws(() => scenarioInput(context({ ...flags, 'question-id': '' }), true));
    assert.throws(() => scenarioInput(context({ ...flags, 'query-path': queryPath }), true));
    const revision = scenarioInput(context({ ...flags, 'entry-type': 'answer_revision', 'query-path': queryPath }), true);
    assert.equal(revision.answer_id, 'answer:t2');
    assert.equal(revision.target_answer_id, 'answer:q1');
    assert.deepEqual(revision.query_path, queryPath);
    const userMessage = 'For the same question, use only the second week; no comparison needed.';
    assert.equal(scenarioInput(context({ ...flags, 'entry-type': 'answer_revision', 'query-path': queryPath, 'user-message': userMessage }), true).user_message, userMessage);
    assert.throws(() => scenarioInput(context({ ...flags, 'user-message': userMessage }), true));
    assert.throws(() => scenarioInput(context({ ...flags, 'entry-type': 'answer_revision', 'query-path': queryPath, 'answer-id': 'answer:q1' }), true));
  });
});
await test('Dry-run never executes collection; unavailable/older backend does not retry or block a later query', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scenario-transport-'));
  const host = 'https://scenario-test.invalid';
  const prevRoot = process.env.SANDBOX_RUNTIME_ROOT;
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  let status = 200;
  try {
    mkdirSync(join(dir, '.ae-config'));
    writeFileSync(join(dir, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-only-token' }));
    process.env.SANDBOX_RUNTIME_ROOT = dir;
    globalThis.fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path.includes('/token/renew')) return new Response('{}', { status: 404 });
      calls.push(path);
      const body = JSON.parse(String(init?.body));
      if (path.includes('project.info.get')) return new Response(JSON.stringify({ ok: true, data: { analysis_scenario_collection_enabled: true } }));
      if (path.includes('analysis.scenario.collect')) {
        assert.equal(body.input.answer, 'Users fell 12%.');
        assert.deepEqual(body.input.query_path, queryPath);
        assert.equal(body.input.evidence, undefined);
        assert.equal(body.input.result, undefined);
        if (status !== 200) return new Response(JSON.stringify({ ok: false, error: { code: 'UNAVAILABLE', message: 'Collection unavailable' } }), { status });
      }
      return new Response(JSON.stringify({ ok: true, data: { accepted: true, delivery: 'best_effort' } }));
    };
    await runWithCliAgentContext({ agent_session_id: 's1', agent_turn_id: 'q1' }, async () => {
      const ctx = { ...context(), host: () => host } as RuntimeContext;
      assert.equal(scenarioCollect.risk, 'write');
      assert.equal(scenarioAppend.risk, 'write');
      await scenarioCollect.dryRun!(ctx);
      assert.ok(calls[0].endsWith('/dry-run'));
      await scenarioCollect.execute(ctx);
      for (status of [404, 503]) await assert.rejects(() => scenarioCollect.execute(ctx), /Collection unavailable/);
      await executeCapability(host, 'analysis', 'analysis.report_data.run', { project_id: 196, report_ids: [901] });
      assert.equal(calls.length, 8);
    });
  } finally {
    globalThis.fetch = previousFetch;
    clearCliTokenCache(host);
    if (prevRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = prevRoot;
    rmSync(dir, { recursive: true, force: true });
  }
});
await test('Both Skills collect scenarios without self-evaluation and preserve user objections', () => {
  for (const name of ['ae-analysis', 'ae-capability']) {
    const skill = readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    assert.match(skill, /one sample for the whole user scenario, not one per CLI call/);
    assert.match(skill, /do not score correctness/);
    assert.match(skill, /append the user's original text/);
    assert.match(skill, /A separate evaluation task reads these samples later/);
    assert.match(skill, /Collection failure must not block/);
    assert.match(skill, /even when the conclusion stays the same/);
  }
});

await test('Forbidden queries retain actual gateway IDs for collection without retry or login', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scenario-forbidden-'));
  const host = 'https://scenario-forbidden.invalid';
  const previousRoot = process.env.SANDBOX_RUNTIME_ROOT;
  const previousFetch = globalThis.fetch;
  let calls = 0;
  try {
    mkdirSync(join(dir, '.ae-config'));
    writeFileSync(join(dir, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-only-token' }));
    process.env.SANDBOX_RUNTIME_ROOT = dir;
    globalThis.fetch = async (url) => {
      if (String(url).includes('/token/renew')) return new Response('{}', { status: 404 });
      calls++;
      return new Response(JSON.stringify({ ok: false, error: { code: 'PROJECT_PERMISSION_DENIED', message: 'Project access denied.' },
        meta: { invocation_id: 'denied-invocation', client_request_id: 'gateway-request' } }), { status: 403 });
    };
    await assert.rejects(() => executeCapability(host, 'analysis', 'analysis.report_data.run', { project_id: 196 }), (error) => {
      assert.ok(error instanceof PermissionError);
      const meta = Reflect.get(error, 'meta');
      assert.equal(meta?.invocation_id, 'denied-invocation');
      assert.equal(meta?.client_request_id, 'gateway-request');
      return true;
    });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliTokenCache(host);
    if (previousRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = previousRoot;
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('Exact maximum-length Unicode answers and feedback are preserved; oversized text is rejected, never truncated', async () => {
  await runWithCliAgentContext({ agent_session_id: 's1', agent_turn_id: 't3' }, async () => {
    const answer = '用'.repeat(16382) + '😀';
    assert.equal(scenarioInput(context({ answer })).answer, answer);
    assert.throws(() => scenarioInput(context({ answer: answer + 'x' })));
    const flags = { 'question-id': 'q1', 'entry-type': 'user_feedback', 'target-answer-id': 'answer:q1', 'query-path': undefined, text: '错'.repeat(4096) };
    assert.equal(scenarioInput(context(flags), true).text, flags.text);
    assert.throws(() => scenarioInput(context({ ...flags, text: flags.text + 'x' }), true));
  });
});

await test('Project opt-in gates both commands before sending sample content and never caches a grant', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scenario-project-policy-'));
  const host = 'https://scenario-policy.invalid';
  const previousRoot = process.env.SANDBOX_RUNTIME_ROOT;
  const previousFetch = globalThis.fetch;
  const requests: { path: string; input: Record<string, unknown> }[] = [];
  let enabled: unknown = false;
  let failPolicy = false;
  let serverDisabled = false;
  try {
    mkdirSync(join(dir, '.ae-config'));
    writeFileSync(join(dir, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-only-token' }));
    process.env.SANDBOX_RUNTIME_ROOT = dir;
    globalThis.fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path.includes('/token/renew')) return new Response('{}', { status: 404 });
      const body = JSON.parse(String(init?.body));
      requests.push({ path, input: body.input });
      if (path.includes('project.info.get')) {
        assert.deepEqual(body.input, { project_id: 1 });
        if (failPolicy) throw new TypeError('fetch failed');
        return new Response(JSON.stringify({ ok: true, data: { analysis_scenario_collection_enabled: enabled } }));
      }
      return new Response(JSON.stringify({ ok: true, data: serverDisabled
        ? { accepted: false, skipped: true, reason: 'PROJECT_COLLECTION_DISABLED' }
        : { accepted: true, delivery: 'best_effort' } }));
    };
    await runWithCliAgentContext({ agent_session_id: 's1', agent_turn_id: 'q1' }, async () => {
      const ctx = { ...context(), host: () => host } as RuntimeContext;
      const appendCtx = { ...context({ 'question-id': 'q1', 'entry-type': 'user_feedback', 'target-answer-id': 'answer:q1', text: 'Check it.', 'query-path': undefined }), host: () => host } as RuntimeContext;
      for (enabled of [undefined, false, 'true', 'on', 1]) {
        const result = await scenarioCollect.execute(ctx);
        assert.equal(result.data.accepted, false);
        assert.equal(result.data.reason, 'PROJECT_COLLECTION_DISABLED');
        const append = await scenarioAppend.execute(appendCtx);
        assert.equal(append.data.accepted, false);
      }
      assert.ok(requests.every((request) => request.path.includes('project.info.get')));
      enabled = true;
      assert.equal(unwrapOutputData(await scenarioCollect.execute(ctx)).accepted, true);
      assert.equal(unwrapOutputData(await scenarioAppend.execute(appendCtx)).accepted, true);
      assert.equal(requests.filter((request) => request.path.includes('analysis.scenario.')).length, 2);
      enabled = false;
      assert.equal(unwrapOutputData(await scenarioCollect.execute(ctx)).accepted, false);
      assert.equal(requests.filter((request) => request.path.includes('analysis.scenario.')).length, 2);
      failPolicy = true;
      assert.equal(unwrapOutputData(await scenarioCollect.execute(ctx)).reason, 'PROJECT_COLLECTION_CONFIG_UNAVAILABLE');
      assert.equal(requests.filter((request) => request.path.includes('analysis.scenario.')).length, 2);
      failPolicy = false;
      enabled = true;
      serverDisabled = true;
      assert.equal(unwrapOutputData(await scenarioCollect.execute(ctx)).reason, 'PROJECT_COLLECTION_DISABLED');
      const beforeMissingProject = requests.length;
      const missingProject = { ...context({ 'project-id': undefined }), host: () => host } as RuntimeContext;
      assert.equal(unwrapOutputData(await scenarioCollect.execute(missingProject)).reason, 'PROJECT_REQUIRED');
      assert.equal(requests.length, beforeMissingProject);
      await executeCapability(host, 'analysis', 'analysis.report_data.run', { project_id: 1, report_ids: [901] });
      assert.ok(requests.at(-1)?.path.includes('analysis.report_data.run'));
    });
  } finally {
    globalThis.fetch = previousFetch;
    clearCliTokenCache(host);
    if (previousRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = previousRoot;
    rmSync(dir, { recursive: true, force: true });
  }
});
