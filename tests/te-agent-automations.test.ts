import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import { createAutomation, listAutomations, updateAutomation } from '../src/commands/te-agent/automations.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { TeAgentApiError } from '../src/core/te-agent-client.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

function dryRun(command: string, args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  const output = execFileSync(
    process.execPath,
    ['--import', 'tsx', 'src/index.ts', '--dry-run', 'agent', command, ...args],
    {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: 'pipe',
      env: {
        ...process.env,
        TE_AGENT_CONVERSATION_ID: '',
        TE_AGENT_CURRENT_AGENT_ID: '',
        TE_AGENT_CURRENT_MODEL_ID: '',
        ...env,
      },
    },
  );
  const result = JSON.parse(output);
  assert.equal(result.ok, true);
  return result.data;
}

test('list automations scopes the query to a workspace and preserves existing filters', () => {
  const preview = dryRun('+list-automations', [
    '--agent-space-id', 'space/alpha?x=1',
    '--q', 'Daily & weekly',
    '--status', 'paused',
    '--limit', '5',
  ]);
  assert.deepEqual(preview, {
    method: 'GET',
    url: '/api/sandbox/agent/automations?q=Daily+%26+weekly&status=paused&limit=5&agentSpaceId=space%2Falpha%3Fx%3D1',
  });
  assert.deepEqual(dryRun('+list-automations'), {
    method: 'GET',
    url: '/api/sandbox/agent/automations',
  });
});

test('create automation supports an explicit workspace without overriding conversation inheritance', () => {
  const args = [
    '--name', 'Daily report',
    '--message', 'Prepare the report',
    '--schedule-kind', 'daily',
    '--time', '09:00',
  ];
  const env = {
    TE_AGENT_CONVERSATION_ID: 'conversation-from-runtime',
    TE_AGENT_CURRENT_AGENT_ID: 'agent-from-runtime',
    TE_AGENT_CURRENT_MODEL_ID: 'model-from-runtime',
  };
  const preview = dryRun('+create-automation', [
    ...args, '--agent-space-id', 'space-beta',
  ], env);
  assert.deepEqual(preview, {
    method: 'POST',
    url: '/api/sandbox/agent/automations',
    body: {
      name: 'Daily report',
      message: 'Prepare the report',
      agentId: 'agent-from-runtime',
      conversationId: 'conversation-from-runtime',
      model: 'model-from-runtime',
      agentSpaceId: 'space-beta',
      schedule: { kind: 'daily', time: '09:00' },
      triggerType: 'scheduled',
      reuseConversation: false,
      status: 'active',
    },
  });
  const inherited = dryRun('+create-automation', args, env);
  assert.equal(Object.hasOwn(inherited.body, 'agentSpaceId'), false);
  assert.equal(inherited.body.conversationId, 'conversation-from-runtime');
  const legacy = dryRun('+create-automation', [...args, '--agent-id', 'agent-explicit']);
  assert.equal(Object.hasOwn(legacy.body, 'agentSpaceId'), false);
  assert.equal(Object.hasOwn(legacy.body, 'conversationId'), false);
});

test('update automation selects the workspace in the URL without moving the task', () => {
  const preview = dryRun('+update-automation', [
    '--id', 'automation/1',
    '--agent-space-id', 'space/alpha?x=1',
    '--enabled', 'false',
  ]);
  assert.deepEqual(preview, {
    method: 'PATCH',
    url: '/api/sandbox/agent/automations/automation%2F1?agentSpaceId=space%2Falpha%3Fx%3D1',
    body: { status: 'paused' },
  });
  assert.deepEqual(dryRun('+update-automation', ['--id', 'automation-1', '--enabled', 'true']), {
    method: 'PATCH',
    url: '/api/sandbox/agent/automations/automation-1',
    body: { status: 'active' },
  });
  assert.throws(() => dryRun('+update-automation', [
    '--id', 'automation-1', '--agent-space-id', 'space-alpha',
  ]));
});

for (const workspaceEnabled of [true, false]) {
  test(workspaceEnabled
    ? 'create, list, and update send workspace scope through the real HTTP client'
    : 'omitted workspace scope preserves legacy requests and responses without workspace fields', async (t) => {
    const host = workspaceEnabled ? 'http://automation-command.test' : 'http://legacy-automation-command.test';
    const calls: Array<{ method: string; url: string; body: unknown }> = [];
    const scope = workspaceEnabled ? { agentSpaceId: 'space-alpha' } : {};
    const automation = { id: 'automation-1', ...scope, status: 'active' };
    const creationResult = { automation, detailPath: '/automations/automation-1' };
    const context = (values: Record<string, unknown>): RuntimeContext => ({
      str: (name) => String(values[name] ?? ''),
      num: (name) => Number(values[name] ?? 0),
      optionalNum: (name) => values[name] === undefined ? undefined : Number(values[name]),
      bool: (name) => Boolean(values[name]),
      json: (name) => values[name],
      list: () => [],
      api: async () => undefined,
      communityReport: async () => undefined,
      localDataUpload: async () => undefined,
      querySql: async () => undefined,
      queryReportData: async () => undefined,
      token: async () => '',
      host: () => host,
      mcpUrl: () => undefined,
      service: () => 'agent',
      out: async () => undefined,
    });
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith('/v1/ta/cli/token/')) {
        return Response.json({ return_code: 1 }, { status: 500 });
      }
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url: url.toString(), body });
      if (url.searchParams.get('agentSpaceId') === 'space-other') {
        return Response.json({ error: 'Automation not found', code: 'AUTOMATION_NOT_FOUND' }, { status: 404 });
      }
      if (method === 'POST') return Response.json(creationResult, { status: 201 });
      return Response.json(method === 'GET' ? { items: [automation] } : automation);
    });
    setCliTokenManual('automation-contract-test-token', host);
    t.after(() => clearCliToken(host));

    const created = await createAutomation.execute(context({
      name: 'Daily report', message: 'Prepare the report',
      agentId: 'agent-1', scheduleKind: 'daily', time: '09:00', ...scope,
    }));
    assert.deepEqual(created, creationResult);
    assert.deepEqual(await listAutomations.execute(context(scope)), {
      items: [automation],
    });
    assert.deepEqual(await updateAutomation.execute(context({
      id: 'automation-1', ...scope, enabled: false,
    })), automation);
    const query = workspaceEnabled ? '?agentSpaceId=space-alpha' : '';
    const endpoint = `${host}/agent/api/sandbox/agent/automations`;
    assert.deepEqual(calls.map(({ method, url }) => ({ method, url })), [
      { method: 'POST', url: endpoint },
      { method: 'GET', url: `${endpoint}${query}` },
      { method: 'PATCH', url: `${endpoint}/automation-1${query}` },
    ]);
    const createBody = calls[0].body as Record<string, unknown>;
    assert.equal(Object.hasOwn(createBody, 'agentSpaceId'), workspaceEnabled);
    if (workspaceEnabled) assert.equal(createBody.agentSpaceId, 'space-alpha');
    assert.deepEqual(calls[2].body, { status: 'paused' });

    if (!workspaceEnabled) return;
    await assert.rejects(
      () => updateAutomation.execute(context({ id: 'automation-1', agentSpaceId: 'space-other', enabled: false })),
      (error: unknown) => error instanceof TeAgentApiError && error.status === 404 && error.code === 'AUTOMATION_NOT_FOUND',
    );
    assert.equal(calls.length, 4);
    assert.equal(calls[3].url, 'http://automation-command.test/agent/api/sandbox/agent/automations/automation-1?agentSpaceId=space-other');
  });
}
