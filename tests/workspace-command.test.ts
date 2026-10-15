import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import workspaceCommands, {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  setWorkspaceCapabilities,
  updateWorkspace,
  updateWorkspaceMember,
} from '../src/commands/workspace/index.ts';
import { currentAgentSpaceId, isAgentSpaceRuntime, assertLegacyWorkspaceCommand } from '../src/core/agent-space-context.ts';
import { clearCliToken } from '../src/core/cli-token.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const HOST = 'http://workspace.local';

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => typeof values[name] === 'string' ? String(values[name]) : '',
    num: (name) => typeof values[name] === 'number' ? Number(values[name]) : 0,
    optionalNum: (name) => typeof values[name] === 'number' ? Number(values[name]) : undefined,
    bool: (name) => values[name] === true,
    json: (name) => values[name],
    list: () => [],
    api: async () => { throw new Error('not used'); },
    communityReport: async () => { throw new Error('not used'); },
    localDataUpload: async () => { throw new Error('not used'); },
    querySql: async () => { throw new Error('not used'); },
    queryReportData: async () => { throw new Error('not used'); },
    token: async () => '', host: () => HOST, mcpUrl: () => undefined, service: () => 'workspace', out: async () => {},
  };
}

assert.deepEqual(
  workspaceCommands.map((command) => [command.resource, command.command].filter(Boolean).join(' ')),
  [
    'list', 'get', 'current', 'create', 'update', 'delete', 'recover',
    'asset list', 'asset read', 'asset upload', 'asset download', 'asset mkdir', 'asset move',
    'asset delete', 'capability list', 'capability set', 'member list', 'member add',
    'member update', 'member transfer-owner', 'member remove', 'activity list',
  ],
);
assert.equal(
  new Set(workspaceCommands.map((command) => `${command.resource ?? ''}/${command.command}`)).size,
  workspaceCommands.length,
);

const listPreview = listWorkspaces.dryRun!(ctx({ type: 'shared', status: 'ACTIVE', query: 'growth', limit: 20 }));
assert.equal(listPreview.url, `${HOST}/agent/api/cli/workspace/v1/agent-spaces?type=shared&status=ACTIVE&query=growth&limit=20`);
assert.throws(() => listWorkspaces.validate?.(ctx({ type: 'legacy' })), /must be one of/);

const getPreview = getWorkspace.dryRun!(ctx({ workspaceId: 'space-1' }));
assert.equal(getPreview.url, `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1`);
assert.equal(getPreview.params?.target_url, `${HOST}/agent/api/cli/workspace/v1/target?agentSpaceId=space-1`);

const capabilityContext = ctx({
  workspaceId: 'space-1', version: 0, capabilityType: 'skill', selectedIds: ['skill-1', 'skill-1', 'skill-2'],
});
setWorkspaceCapabilities.validate?.(capabilityContext);
const capabilityPreview = setWorkspaceCapabilities.dryRun!(capabilityContext);
assert.deepEqual(capabilityPreview.body, {
  revision: 0,
  capabilityType: 'skill',
  selectedIds: ['skill-1', 'skill-2'],
  operationSource: 'ae_cli',
});
assert.equal(setWorkspaceCapabilities.risk, 'high-risk-write');
assert.equal(deleteWorkspace.risk, 'high-risk-write');

assert.throws(() => createWorkspace.validate?.(ctx({ type: 'shared', name: 'Nope' })), /Only personal AgentSpaces/);

const updatePreview = updateWorkspace.dryRun!(ctx({ workspaceId: 'space-1', name: 'Renamed' }));
assert.deepEqual(updatePreview.body, {
  name: 'Renamed',
  operationSource: 'ae_cli',
});

const previewInput: Record<string, Record<string, unknown>> = {
  list: { type: 'personal', status: 'ACTIVE', limit: 20 },
  get: { workspaceId: 'space-1' },
  current: { workspaceId: 'space-1' },
  create: { type: 'personal', name: 'Research' },
  update: { workspaceId: 'space-1', name: 'Research' },
  delete: { workspaceId: 'space-1' },
  recover: { workspaceId: 'space-1' },
  'asset list': { workspaceId: 'space-1', path: 'reports' },
  'asset read': { workspaceId: 'space-1', path: 'reports/result.md' },
  'asset upload': { workspaceId: 'space-1', file: 'result.md', path: 'reports' },
  'asset download': { workspaceId: 'space-1', path: 'reports/result.bin', output: 'result.bin' },
  'asset mkdir': { workspaceId: 'space-1', path: 'reports', name: 'archive' },
  'asset move': { workspaceId: 'space-1', path: 'reports/result.md', destination: 'archive' },
  'asset delete': { workspaceId: 'space-1', path: 'reports/result.md' },
  'capability list': { workspaceId: 'space-1' },
  'capability set': { workspaceId: 'space-1', version: 0, capabilityType: 'skill', selectedIds: [] },
  'member list': { workspaceId: 'space-1', candidateQuery: 'Alex' },
  'member add': { workspaceId: 'space-1', userId: 'user-2', role: 'MEMBER' },
  'member update': { workspaceId: 'space-1', userId: 'user-2', role: 'ADMIN' },
  'member transfer-owner': { workspaceId: 'space-1', userId: 'user-2' },
  'member remove': { workspaceId: 'space-1', userId: 'user-2' },
  'activity list': { workspaceId: 'space-1', limit: 8 },
};

const expectedPreviews: Record<string, { method: string; url: string; body?: unknown }> = {
  list: { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces?type=personal&status=ACTIVE&limit=20` },
  get: { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1` },
  current: { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/target?agentSpaceId=space-1` },
  create: {
    method: 'POST',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces`,
    body: { name: 'Research', description: undefined, type: 'personal', operationSource: 'ae_cli' },
  },
  update: {
    method: 'PATCH',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1`,
    body: { name: 'Research', operationSource: 'ae_cli' },
  },
  delete: { method: 'DELETE', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1` },
  recover: {
    method: 'POST',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/recover`,
    body: { operationSource: 'ae_cli' },
  },
  'asset list': { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/documents?path=reports` },
  'asset read': { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/documents/content?path=reports%2Fresult.md` },
  'asset upload': {
    method: 'POST',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/documents/upload`,
    body: { file: path.resolve('result.md'), path: 'reports' },
  },
  'asset download': {
    method: 'GET',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/documents/download?path=reports%2Fresult.bin`,
    body: { output: path.resolve('result.bin'), overwrite: false },
  },
  'asset mkdir': {
    method: 'POST',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/documents/mkdir`,
    body: { path: 'reports', name: 'archive' },
  },
  'asset move': {
    method: 'PATCH',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/documents`,
    body: { operation: 'move', path: 'reports/result.md', destination: 'archive' },
  },
  'asset delete': { method: 'DELETE', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/documents?path=reports%2Fresult.md` },
  'capability list': { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/capabilities` },
  'capability set': {
    method: 'PUT',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/capabilities`,
    body: { revision: 0, capabilityType: 'skill', selectedIds: [], operationSource: 'ae_cli' },
  },
  'member list': { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/members?candidateQuery=Alex` },
  'member add': {
    method: 'POST',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/members`,
    body: { userId: 'user-2', role: 'MEMBER', operationSource: 'ae_cli' },
  },
  'member update': {
    method: 'PATCH',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/members/user-2`,
    body: { role: 'ADMIN', operationSource: 'ae_cli' },
  },
  'member transfer-owner': {
    method: 'PATCH',
    url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/members/user-2`,
    body: { role: 'OWNER', operationSource: 'ae_cli' },
  },
  'member remove': { method: 'DELETE', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/members/user-2` },
  'activity list': { method: 'GET', url: `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-1/activities?limit=8` },
};

for (const command of workspaceCommands) {
  const commandPath = [command.resource, command.command].filter(Boolean).join(' ');
  assert.ok(command.dryRun, `${commandPath} must expose a dry-run`);
  const preview = command.dryRun!(ctx(previewInput[commandPath]));
  const expected = expectedPreviews[commandPath];
  assert.equal(preview.method, expected.method, `${commandPath} method`);
  assert.equal(preview.url, expected.url, `${commandPath} url`);
  if (Object.prototype.hasOwnProperty.call(expected, 'body')) {
    assert.deepEqual(preview.body, expected.body, `${commandPath} body`);
  } else {
    assert.equal(preview.body, undefined, `${commandPath} must not send a body`);
  }
}

assert.throws(
  () => addWorkspaceMember.validate?.(ctx({ workspaceId: 'space-1', userId: 'user-2', role: 'OWNER' })),
  /must be one of/,
);
assert.throws(
  () => updateWorkspaceMember.validate?.(ctx({ workspaceId: 'space-1', userId: 'user-2', role: 'OWNER' })),
  /must be one of/,
);

const originalFetch = globalThis.fetch;
const originalEnv = {
  HOME: process.env.HOME,
  SANDBOX_RUNTIME_ROOT: process.env.SANDBOX_RUNTIME_ROOT,
  TE_AGENT_CURRENT_AGENT_SPACE_ID: process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID,
  TE_AGENT_CONVERSATION_ID: process.env.TE_AGENT_CONVERSATION_ID,
  TE_CLAUDE_BASE_PATH: process.env.TE_CLAUDE_BASE_PATH,
};
try {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-workspace-token-'));
  fs.mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(path.join(runtimeRoot, '.ae-config', 'cli-token.json'), JSON.stringify({ url: HOST, token: 'cli_workspace' }));
  process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-workspace-home-'));
  process.env.SANDBOX_RUNTIME_ROOT = runtimeRoot;
  delete process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID;
  delete process.env.TE_AGENT_CONVERSATION_ID;
  delete process.env.TE_CLAUDE_BASE_PATH;
  clearCliToken(HOST);

  const calls: Array<{ url: string; headers: Headers }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes('/v1/ta/cli/token/renew')) {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    const body = calls.length === 1
      ? { ok: true, data: { agentSpaceId: 'space-resolved', spaceType: 'shared', role: 'MEMBER' } }
      : { ok: true, data: { item: { id: 'space-resolved', name: 'Growth' } } };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;

  const result = await getWorkspace.execute(ctx({ conversationId: 'conversation-1' }));
  assert.deepEqual(result, { item: { id: 'space-resolved', name: 'Growth' } });
  assert.equal(calls[0].url, `${HOST}/agent/api/cli/workspace/v1/target?conversationId=conversation-1`);
  assert.equal(calls[1].url, `${HOST}/agent/api/cli/workspace/v1/agent-spaces/space-resolved`);
  assert.equal(calls[0].headers.get('cli-token'), 'cli_workspace');

  process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID = 'space-env';
  assert.equal(currentAgentSpaceId(), 'space-env');
  assert.equal(isAgentSpaceRuntime(), true);
  assert.throws(() => assertLegacyWorkspaceCommand('sync'), /legacy sandbox Workspace/);

  delete process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID;
  const agentSpaceCwd = path.join(runtimeRoot, 'spaces', 'actived', 'space-cwd', '.conversations', 'conversation-1');
  fs.mkdirSync(agentSpaceCwd, { recursive: true });
  const previousCwd = process.cwd();
  try {
    process.chdir(agentSpaceCwd);
    assert.equal(currentAgentSpaceId(), 'space-cwd');
    assert.equal(isAgentSpaceRuntime(), true);
    assert.throws(() => assertLegacyWorkspaceCommand('model'), /legacy sandbox Workspace/);
  } finally {
    process.chdir(previousCwd);
  }
} finally {
  clearCliToken(HOST);
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log('workspace command tests passed');
