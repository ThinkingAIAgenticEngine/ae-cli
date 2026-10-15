import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analysisFeedbackInput, analysisFeedbackSubmit } from '../src/commands/te-analysis/feedback/submit.js';
import { CliValidationError } from '../src/core/errors.js';
import { executeCapability } from '../src/core/capability-api.js';
import { clearCliTokenCache } from '../src/core/cli-token.js';
import type { RuntimeContext } from '../src/framework/types.js';

function context(overrides: Record<string, unknown> = {}): RuntimeContext {
  const flags: Record<string, unknown> = {
    'query-completed': true, 'query-capability-id': 'analysis.report_data.run',
    satisfaction: 'dissatisfied', 'feedback-text': 'The selected report uses the wrong metric.',
    'target-turn-ids': ['analysis-turn-1', 'analysis-turn-2'], ...overrides,
  };
  return {
    str: (key) => String(flags[key] ?? ''), bool: (key) => flags[key] === true,
    json: (key) => flags[key], optionalNum: (key) => flags[key] as number | undefined,
  } as RuntimeContext;
}

await test('Feedback rejects incomplete queries and non-query actions before transport', () => {
  assert.throws(() => analysisFeedbackInput(context({ 'query-completed': false })), CliValidationError);
  for (const id of ['analysis.asset.search', 'analysis.report.get', 'analysis.dashboard.delete', 'project.config.update', 'analysis.feedback.submit']) {
    assert.throws(() => analysisFeedbackInput(context({ 'query-capability-id': id })), /executed analysis data query/);
  }
  assert.throws(() => analysisFeedbackInput(context({ satisfaction: 'no_reply' })), /explicit user feedback/);
  assert.throws(() => analysisFeedbackInput(context({ 'feedback-text': '' })), /original user feedback/);
});

await test('Feedback targets earlier analysis turns and reuses session with a stable feedback ID', () => {
  const dir = mkdtempSync(join(tmpdir(), 'analysis-feedback-'));
  const previous = process.env.TA_CLI_CONTEXT_FILE;
  process.env.TA_CLI_CONTEXT_FILE = join(dir, 'context.json');
  writeFileSync(process.env.TA_CLI_CONTEXT_FILE, JSON.stringify({
    agent_session_id: 'session-1', agent_turn_id: 'feedback-turn', agent_model: 'collector-model',
  }));
  try {
    const input = analysisFeedbackInput(context());
    assert.equal(input.agent_session_id, 'session-1');
    assert.deepEqual(input.target_turn_ids, ['analysis-turn-1', 'analysis-turn-2']);
    assert.equal(input.feedback_id, analysisFeedbackInput(context()).feedback_id);
    assert.equal(input.answer, undefined);
    assert.equal(input.agent_model, undefined);
    assert.throws(() => analysisFeedbackInput(context({ 'target-turn-ids': ['feedback-turn'] })), /not the feedback turn/);
    assert.throws(() => analysisFeedbackInput(context({ 'target-turn-ids': [123] })), /existing turn IDs/);
    assert.throws(() => analysisFeedbackInput(context({ 'feedback-id': ' ' })), /nonblank/);
    assert.throws(() => analysisFeedbackInput(context({ 'project-id': 1.5 })), /positive integer/);
    assert.deepEqual(analysisFeedbackInput(context({ 'target-turn-ids': undefined })).target_turn_ids, []);
    assert.ok(analysisFeedbackSubmit.dryRun);
    assert.equal(analysisFeedbackSubmit.risk, 'write');
  } finally {
    if (previous === undefined) delete process.env.TA_CLI_CONTEXT_FILE;
    else process.env.TA_CLI_CONTEXT_FILE = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('Transport keeps feedback context distinct, validates without submitting, and business calls still work after feedback failure', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'analysis-feedback-transport-'));
  const host = 'https://analysis-feedback-test.invalid';
  const envKeys = ['SANDBOX_RUNTIME_ROOT', 'TA_CLI_CONTEXT_FILE'];
  const previousEnv = new Map(envKeys.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  let rejectFeedback = false;
  try {
    mkdirSync(join(dir, '.ae-config'));
    writeFileSync(join(dir, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'test-only-token' }));
    process.env.SANDBOX_RUNTIME_ROOT = dir;
    process.env.TA_CLI_CONTEXT_FILE = join(dir, 'context.json');
    writeFileSync(process.env.TA_CLI_CONTEXT_FILE, JSON.stringify({
      agent_session_id: 'session-1', agent_turn_id: 'feedback-turn', agent_model: 'collector-model',
    }));
    globalThis.fetch = async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === '/v1/ta/cli/token/renew') return new Response('{}', { status: 404 });
      calls.push(path);
      const body = JSON.parse(String(init?.body));
      if (path.includes('analysis.feedback.submit')) {
        assert.equal(body.input.agent_session_id, 'session-1');
        assert.deepEqual(body.input.target_turn_ids, ['analysis-turn-1', 'analysis-turn-2']);
        assert.equal(body.client_context.agent_turn_id, 'feedback-turn');
        assert.equal(body.client_context.agent_model, 'collector-model');
        assert.equal(body.input.answer_text, undefined);
        if (rejectFeedback) return new Response(JSON.stringify({ ok: false, error: { code: 'UNAVAILABLE', message: 'Feedback unavailable' } }), { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true, data: { accepted: true, delivery: 'best_effort' } }), { status: 200 });
    };
    const ctx = { ...context(), host: () => host } as RuntimeContext;
    await analysisFeedbackSubmit.dryRun!(ctx);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].endsWith('/dry-run'));
    await analysisFeedbackSubmit.execute(ctx);
    assert.ok(calls[1].endsWith('/execute'));
    rejectFeedback = true;
    await assert.rejects(() => analysisFeedbackSubmit.execute(ctx), /Feedback unavailable/);
    await executeCapability(host, 'analysis', 'analysis.report_data.run', { project_id: 196, report_id: 1 });
    assert.ok(calls.at(-1)?.endsWith('analysis.report_data.run/execute'));
    assert.equal(calls.length, 4, 'No automatic feedback retry or business interruption');
  } finally {
    globalThis.fetch = previousFetch;
    clearCliTokenCache(host);
    for (const [key, value] of previousEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('Both Skills ask only after completed query and final answer, never after other actions', () => {
  for (const name of ['ae-analysis', 'ae-capability']) {
    const skill = readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    assert.match(skill, /only after a completed analysis data query and the final business analysis answer/i);
    for (const exclusion of ['individual CLI calls', 'metadata inspection', 'asset governance/writes', 'configuration', 'running exports', 'failed queries']) {
      assert.ok(skill.includes(exclusion), `${name} must exclude ${exclusion}`);
    }
    assert.match(skill, /No explicit feedback means no submission or new feedback event/);
    assert.match(skill, /do not upload the analysis answer/i);
    assert.match(skill, /must not block subsequent business work/);
  }
});
