import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runWithCliAgentContext } from '../src/core/cli-agent-context.js';
import { requestCapabilityGateway, uploadInputFileBytes, downloadCapabilityArtifact } from '../src/core/capability-api.js';
import { taskList } from '../src/commands/te-engage/engage-task/task/list.js';
import { channelList } from '../src/commands/te-engage/engage-setting/channel/list.js';
import { configItemList } from '../src/commands/te-engage/engage-scene/config-item/list.js';
import { activityList } from '../src/commands/te-engage/engage-activity/activity/list.js';
import { workbenchList } from '../src/commands/te-engage/engage-workbench/workbench/list.js';
import { runInspect } from '../src/commands/te-engage/engage-query/run/inspect.js';
import { artifactDownload } from '../src/commands/te-engage/engage-query/artifact/download.js';
import { createRuntimeContext } from '../src/framework/runner.js';
import { flowList } from '../src/commands/te-engage/engage-flow/flow/list.js';
import { callMcpTool } from '../src/core/mcp.js';

const host = 'https://agent-context.invalid';
const context = {
  agent_client: 'codex', runtime: 'codex_cli', agent_model: 'actual-model',
  agent_session_id: 'session', agent_turn_id: 'turn', user_intent: 'Read current reports',
};
const headerFields = {
  agent_client: 'Agent-Client', runtime: 'Runtime', agent_model: 'Agent-Model',
  agent_session_id: 'Agent-Session-Id', agent_turn_id: 'Agent-Turn-Id', user_intent: 'User-Intent',
};

await test('CLI gateway uploads, downloads and Engage commands carry caller context without changing files', async () => {
  const oldFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  const dir = mkdtempSync(join(tmpdir(), 'cli-context-transports-'));
  const calls: { url: string; init: RequestInit }[] = [];
  const bytes = new Uint8Array([0, 1, 128, 255]);
  try {
    process.env.TA_CLI_CONTEXT_FILE = join(dir, 'no-context.json');
    for (const key of ['TA_CLI_AGENT_MODEL', 'CODEX_MODEL', 'OPENAI_MODEL', 'CLAUDE_CODE_MODEL',
      'CLAUDE_MODEL', 'ANTHROPIC_MODEL', 'WORKBUDDY_MODEL', 'WORKBUDDY_AGENT_MODEL']) delete process.env[key];
    process.env.AE_CLI_TOKEN = 'cli_fixture-not-a-real-credential';
    process.env.AE_CLI_TOKEN_HOST = host;
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/api/cli/') || String(url).endsWith('/mcp')) {
        calls.push({ url: String(url), init: init! });
      }
      return new Response(String(url).endsWith('/download')
        ? bytes : JSON.stringify({ ok: true, data: { status: 'SUCCEEDED', artifact_id: 'artifact', artifact_status: 'READY' }, result: { content: [] } }), { status: 200 });
    };
    const commands = [flowList, taskList, channelList, configItemList, activityList, workbenchList, runInspect];
    const options = { req: {}, projectId: 1, runId: 'run', artifactId: 'artifact', output: join(dir, 'artifact.bin') };
    await runWithCliAgentContext(context, async () => {
      await requestCapabilityGateway(host, 'analysis', 'capabilities', 'GET');
      await uploadInputFileBytes(host, 'analysis', 1, 'fixture', bytes, 'fixture.bin');
      const artifact = await downloadCapabilityArtifact(host, 'analysis', 'run', 'artifact');
      assert.deepEqual(new Uint8Array(artifact.bytes), bytes);
      for (const command of [...commands, artifactDownload]) {
        await command.execute(createRuntimeContext(command, options, { host, format: 'json' }));
      }
    });
    assert.equal(calls.length, 12, JSON.stringify(calls.map((call) => call.url)));
    for (const { url, init } of calls) {
      const headers = new Headers(init.headers);
      assert.equal(headers.get('X-TA-CLI-Context-Encoding'), 'base64url', url);
      for (const [field, suffix] of Object.entries(headerFields)) {
        const value = headers.get(`X-TA-CLI-${suffix}`);
        assert.ok(value, `${url}: missing ${field}`);
        assert.equal(Buffer.from(value, 'base64url').toString(), context[field as keyof typeof context], url);
      }
    }
    const form = calls[1].init.body as FormData;
    const file = form.get('file') as File;
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
    assert.equal(new Headers(calls[1].init.headers).has('Content-Type'), false);
    assert.deepEqual(new Uint8Array(readFileSync(options.output)), bytes);
    for (const [index, command] of commands.entries()) {
      assert.ok(calls[index + 3].url.includes('/api/cli/engage/v1/'));
      if (command !== runInspect) assert.ok(calls[index + 3].url.includes(command.service));
    }

    // An unknown model remains optional, and a previous caller's scoped model must not leak.
    const unknownModelStart = calls.length;
    await runWithCliAgentContext({ agent_client: 'external-agent' }, async () => {
      await uploadInputFileBytes(host, 'analysis', 1, 'fixture', bytes, 'fixture.bin');
      await downloadCapabilityArtifact(host, 'analysis', 'run', 'artifact');
    });
    for (const { init } of calls.slice(unknownModelStart)) {
      assert.equal(new Headers(init.headers).has('X-TA-CLI-Agent-Model'), false);
    }
    assert.equal(calls[unknownModelStart].init.body instanceof FormData, true);

    // MCP is deliberately outside the CLI REST telemetry scope.
    await runWithCliAgentContext(context, () => callMcpTool(`${host}/mcp`, 'fixture', {}, host));
    assert.equal(new Headers(calls.at(-1)!.init.headers).has('X-TA-CLI-Agent-Model'), false);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = oldEnv;
    rmSync(dir, { recursive: true, force: true });
  }
});
