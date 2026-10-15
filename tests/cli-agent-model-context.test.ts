import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executeCapability } from '../src/core/capability-api.js';
import { clearCliTokenCache } from '../src/core/cli-token.js';
import { readCliAgentContext, cliAgentContextHeaders, runWithCliAgentContext, withCliAgentContextBody, type CliAgentContext } from '../src/core/cli-agent-context.js';

const capabilitySkill = readFileSync(new URL('../skills/ae-capability/SKILL.md', import.meta.url), 'utf8');
const analysisSkill = readFileSync(new URL('../skills/ae-analysis/SKILL.md', import.meta.url), 'utf8');
const modelPlaceholder = '<confirmed-current-model-id>';

await test('concurrent CLI calls keep their Agent session and turn context isolated', async () => {
  const contexts = await Promise.all(['first', 'second'].map((id) =>
    runWithCliAgentContext({ agent_session_id: id, agent_turn_id: `turn-${id}` }, async () => {
      await new Promise((resolve) => setImmediate(resolve));
      return readCliAgentContext();
    })));
  assert.deepEqual(contexts.map((context) => [context.agent_session_id, context.agent_turn_id]), [
    ['first', 'turn-first'],
    ['second', 'turn-second'],
  ]);
});

function withContextFile(fn: (file: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'ae-cli-model-context-'));
  const previous = process.env.TA_CLI_CONTEXT_FILE;
  process.env.TA_CLI_CONTEXT_FILE = join(dir, 'context.json');
  try {
    fn(process.env.TA_CLI_CONTEXT_FILE);
  } finally {
    if (previous === undefined) delete process.env.TA_CLI_CONTEXT_FILE;
    else process.env.TA_CLI_CONTEXT_FILE = previous;
    rmSync(dir, { recursive: true, force: true });
  }
}

await test('Agent writer preserves a confirmed model without model environment variables', () => {
  const template = capabilitySkill.match(/```bash\n(mkdir -p \.ae\n[\s\S]*?)\nae-cli \.\.\.\n```/)?.[1];
  assert.ok(template, 'The Skill must provide an executable context-file writer');
  const dir = mkdtempSync(join(tmpdir(), 'ae-cli-model-writer-'));
  const env = { ...process.env };
  for (const key of ['CODEX_MODEL', 'OPENAI_MODEL', 'TA_CLI_AGENT_MODEL']) delete env[key];
  try {
    execFileSync('sh', ['-c', template.replaceAll(modelPlaceholder, 'test-runtime-model-a')], { cwd: dir, env });
    const payload = JSON.parse(readFileSync(join(dir, '.ae/cli-agent-context.json'), 'utf8'));
    assert.equal(payload.agent_model, 'test-runtime-model-a');
    assert.equal(payload.intent_source, 'agent_context_file');
    assert.ok(payload.user_intent);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('Both entry Skills require active model capture and refresh without blocking business calls', () => {
  for (const source of [capabilitySkill, analysisSkill]) {
    const telemetry = source.split('## Agent Context Telemetry\n')[1]?.split('\n## ')[0];
    assert.ok(telemetry);
    assert.match(telemetry, /actively obtain.*current model identifier.*write.*`agent_model`/);
    assert.match(telemetry, /model changes.*CLI purpose stays the same/);
    assert.match(telemetry, /`context_capture_status: "partial"`/);
    assert.match(telemetry, /do not block.*business command/);
    assert.doesNotMatch(telemetry, /agent_model:\s*process\.env\./);
    assert.doesNotMatch(telemetry, /"agent_model":\s*"gpt-5\.5"/);
  }
});

await test('File model overrides stale fallback and is refreshed for the same business intent', () => {
  const previous = process.env.TA_CLI_AGENT_MODEL;
  process.env.TA_CLI_AGENT_MODEL = 'stale-config-model';
  try {
    withContextFile((file) => {
      const input = { project_id: 1 };
      for (const model of ['test-runtime-model-a', 'test-runtime-model-b']) {
        writeFileSync(file, JSON.stringify({ agent_model: model, user_intent: 'List project dashboards', intent_source: 'agent_context_file' }));
        const context = readCliAgentContext();
        assert.equal(context.agent_model, model);
        assert.equal(Buffer.from(cliAgentContextHeaders(context)['X-TA-CLI-Agent-Model'], 'base64url').toString('utf8'), model);
        const body = withCliAgentContextBody({ input }, context) as { input: typeof input; client_context: CliAgentContext };
        assert.deepEqual(body.input, input);
        assert.equal(body.client_context.agent_model, model);
      }
    });
  } finally {
    if (previous === undefined) delete process.env.TA_CLI_AGENT_MODEL;
    else process.env.TA_CLI_AGENT_MODEL = previous;
  }
});

await test('Unknown model with partial context still executes the business request', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ae-cli-model-optional-'));
  const host = 'https://cli-model-context-test.invalid';
  const previousEnv = new Map<string, string | undefined>();
  const keys = ['SANDBOX_RUNTIME_ROOT', 'TA_CLI_CONTEXT_FILE', 'TA_CLI_AGENT_MODEL', 'CODEX_MODEL', 'OPENAI_MODEL', 'CLAUDE_CODE_MODEL', 'CLAUDE_MODEL', 'ANTHROPIC_MODEL', 'WORKBUDDY_MODEL', 'WORKBUDDY_AGENT_MODEL'];
  for (const key of keys) {
    previousEnv.set(key, process.env[key]);
    delete process.env[key];
  }
  const previousFetch = globalThis.fetch;
  let businessCalls = 0;
  try {
    mkdirSync(join(dir, '.ae-config'));
    writeFileSync(join(dir, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'test-only-token' }));
    process.env.SANDBOX_RUNTIME_ROOT = dir;
    process.env.TA_CLI_CONTEXT_FILE = join(dir, 'context.json');
    writeFileSync(process.env.TA_CLI_CONTEXT_FILE, JSON.stringify({
      agent_client: 'test-client', user_intent: 'List project dashboards',
      intent_source: 'agent_context_file', context_capture_status: 'partial',
    }));
    globalThis.fetch = async (url, init) => {
      if (new URL(String(url)).pathname === '/v1/ta/cli/token/renew') return new Response('{}', { status: 404 });
      businessCalls += 1;
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.input, { project_id: 1 });
      assert.equal(body.client_context.agent_model, undefined);
      assert.equal(body.client_context.context_capture_status, 'partial');
      assert.equal((init?.headers as Record<string, string>)['X-TA-CLI-Agent-Model'], undefined);
      return new Response(JSON.stringify({ ok: true, data: { items: [] } }), { status: 200 });
    };
    const result = await executeCapability(host, 'analysis', 'analysis.dashboard.list', { project_id: 1 });
    assert.deepEqual(result.items, []);
    assert.equal(businessCalls, 1);
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
