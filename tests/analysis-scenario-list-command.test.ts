import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scenarioList, scenarioListInput, scenarioBegin, scenarioDuration, scenarioGet, scenarioGetInput } from '../src/commands/te-analysis/scenario/index.js';
import { baseCommands } from '../src/commands/te-analysis/index.js';
import { clearCliTokenCache } from '../src/core/cli-token.js';
import { readOutputMetadata, unwrapOutputData } from '../src/framework/output.js';
import type { RuntimeContext } from '../src/framework/types.js';

function context(flags: Record<string, unknown>): RuntimeContext {
  return { str: (key: string) => String(flags[key] ?? ''), host: () => 'https://scenario-list.invalid' } as RuntimeContext;
}

await test('Scenario list validates typed paging without requiring answering-session context', () => {
  assert.deepEqual(scenarioListInput(context({ 'project-id': 1 })), { project_id: 1, days: 7, limit: 20, offset: 0 });
  assert.deepEqual(scenarioListInput(context({ 'project-id': 1, days: 30, limit: 10, offset: 20,
    'end-time': '2026-10-28T15:00:00+08:00' })), {
    project_id: 1, days: 30, limit: 10, offset: 20, end_time: '2026-10-28T15:00:00+08:00',
  });
  for (const flags of [{}, { 'project-id': 0 }, { days: 0 }, { days: 91 }, { days: 1.5 },
    { limit: 51 }, { limit: 0 }, { offset: -1 }, { offset: 'NaN' },
    { 'end-time': '2026-10-28' }, { 'end-time': 'not-a-date' }, { 'end-time': '2026-02-30T00:00:00Z' }]) {
    assert.throws(() => scenarioListInput(context({ 'project-id': 1, ...flags,
      ...(Object.keys(flags).length === 0 ? { 'project-id': undefined } : {}) })));
  }
  assert.equal(baseCommands.filter((command) => command.capabilityId === 'analysis.scenario.list').length, 1);
  assert.equal(scenarioList.risk, 'read');
  assert.equal(scenarioList.flags.some((flag) => flag.name === 'badcase'), false);
});

await test('Scenario pagination preserves the exact server snapshot including nanoseconds', () => {
  const snapshot = '2026-10-28T11:00:17.010716201Z';
  assert.equal(scenarioListInput(context({ 'project-id': 1, offset: 20, 'end-time': snapshot })).end_time, snapshot);
});

await test('Scenario list calls only its gateway and preserves the complete evidence response', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scenario-list-'));
  const previousRoot = process.env.SANDBOX_RUNTIME_ROOT;
  const previousFetch = globalThis.fetch;
  const paths: string[] = [];
  let unavailable = false;
  const evidence = { items: [{ initial: { question: 'Why did revenue fall?', answer: 'Exact archived answer',
    question_id: 'q', open_id: 'other-user', agent_session_id: 'source-session' },
  entries: [{ entry_type: 'user_feedback', text: 'Please check the period.', target_answer_id: 'a1' }], conflicting_records: 0 }] };
  try {
    mkdirSync(join(dir, '.ae-config'));
    writeFileSync(join(dir, '.ae-config/cli-token.json'), JSON.stringify({ url: 'https://scenario-list.invalid', token: 'fixture-only-token' }));
    process.env.SANDBOX_RUNTIME_ROOT = dir;
    clearCliTokenCache();
    globalThis.fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path.includes('/token/renew')) return new Response('{}', { status: 404 });
      paths.push(path);
      assert.match(path, /analysis\.scenario\.(list|get)\/(execute|dry-run)$/);
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.input, path.includes('.get/')
        ? { project_id: 1, days: 30, open_id: 'source', agent_session_id: 'session', question_id: 'q' }
        : { project_id: 1, days: 30, limit: 20, offset: 0 });
      if (unavailable) return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Archive review unavailable on this server.' } }), { status: 404 });
      return new Response(JSON.stringify({ ok: true, data: evidence, meta: { total: 1, has_more: false,
        end_time: '2026-10-28T07:00:00Z', archive_complete: false } }));
    };
    const result = await scenarioList.execute(context({ 'project-id': 1, days: 30 }));
    assert.deepEqual(JSON.parse(JSON.stringify(unwrapOutputData(result))), evidence);
    assert.equal(readOutputMetadata(result)?.total, 1);
    assert.equal(readOutputMetadata(result)?.has_more, false);
    assert.equal(readOutputMetadata(result)?.end_time, '2026-10-28T07:00:00Z');
    assert.equal(readOutputMetadata(result)?.archive_complete, false);
    await scenarioList.dryRun!(context({ 'project-id': 1, days: 30 }));
    await scenarioGet.execute(context({ 'project-id': 1, days: 30, 'open-id': 'source', 'agent-session-id': 'session', 'question-id': 'q' }));
    assert.equal(paths.length, 3, JSON.stringify(paths));
    unavailable = true;
    await assert.rejects(() => scenarioList.execute(context({ 'project-id': 1, days: 30 })), /Archive review unavailable/);
    assert.equal(paths.length, 4);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliTokenCache();
    if (previousRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = previousRoot;
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('Archive review Skill requires full coverage and concise evidence-based Agent judgments', () => {
  const skill = readFileSync(new URL('../skills/ae-analysis/SKILL.md', import.meta.url), 'utf8');
  const review = readFileSync(new URL('../skills/ae-analysis/references/scenario_list.md', import.meta.url), 'utf8');
  const evaluation = readFileSync(new URL('../skills/ae-analysis/references/scenario_evaluation.md', import.meta.url), 'utf8');
  assert.match(skill, /scenario_list\.md/);
  assert.match(skill, /No server-side rating or evaluation writeback/);
  assert.match(review, /meta\.next_offset/);
  assert.match(review, /first meta\.end_time/);
  assert.match(review, /explicit `--host <target-url>` on every page/);
  assert.match(review, /Do not claim full coverage until all pages are read/);
  assert.match(review, /different metrics, periods, filters, goals/);
  assert.match(review, /Count distinct scenarios, never retries, revisions or feedback entries/);
  assert.match(review, /\| 问题 \| 回答耗时 \| 评估结论 \| 原因说明 \| 出现次数 \|/);
  assert.match(review, /reason is mandatory/);
  assert.match(review, /Do not output verdict codes, raw JSON, a separate evidence dump/);
  assert.match(evaluation, /回答有误/);
  assert.match(evaluation, /回答不完整/);
  assert.match(evaluation, /newly added requirement is not retroactively an omission/);
  assert.doesNotMatch(evaluation, /latest_verdict/);
});


await test('Question clock is local, computed by CLI and rejects fabricated invalid intervals', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Clock must not access the network'); };
  try {
    const before = Date.now();
    const result = await scenarioBegin.execute(context({}));
    assert.ok(Date.parse(result.start_time) >= before);
    assert.equal(scenarioDuration('2026-10-29T00:00:00Z', Date.parse('2026-10-29T00:00:42.300Z')), 42300);
    for (const start of ['bad', '2026-02-30T00:00:00Z', '2026-10-30T00:00:00Z', '2020-01-01T00:00:00Z']) {
      assert.throws(() => scenarioDuration(start, Date.parse('2026-10-29T00:00:00Z')));
    }
    assert.equal(baseCommands.includes(scenarioBegin), true);
  } finally {
    globalThis.fetch = original;
  }
});

await test('Scenario detail preserves exact owner/session/question and snapshot boundaries', () => {
  const flags = { 'project-id': 1, days: 30, 'open-id': 'source-user', 'agent-session-id': 'session', 'question-id': 'q',
    'end-time': '2026-10-28T11:00:17.010716201Z' };
  assert.deepEqual(scenarioGetInput(context(flags)), { project_id: 1, days: 30, open_id: 'source-user',
    agent_session_id: 'session', question_id: 'q', end_time: flags['end-time'] });
  for (const key of ['open-id', 'agent-session-id', 'question-id']) {
    assert.throws(() => scenarioGetInput(context({ ...flags, [key]: '' })));
  }
  assert.equal(scenarioGet.risk, 'read');
  assert.equal(baseCommands.includes(scenarioGet), true);
});
