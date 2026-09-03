import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import systemCommands from '../src/commands/te-system/index.js';
import { createBindFeishuUsersCommand } from '../src/commands/te-system/channel-bindings.js';
import { PermissionError } from '../src/core/errors.js';
import { TeAgentApiError } from '../src/core/te-agent-client.js';
import type { RuntimeContext } from '../src/framework/types.js';

function commandKey(command: { resource?: string; command: string }): string {
  return [command.resource, command.command].filter(Boolean).join(' ');
}

function findSystemCommand(key: string) {
  return systemCommands.find((command) => commandKey(command) === key);
}

const EXPECTED_HIGH_RISK = new Set([
  '+remove-member',
  '+unbind-sandbox-user',
  '+remove-sandbox',
  '+clear-default-model',
  '+remove-quota-rule',
  '+remove-channel',
  'channel whatsapp-web unlink',
  'channel binding unbind',
  '+remove-sandbox-tool',
]);
const WRITE_METHODS = new Map<string, string>([
  ['+add-members', 'POST'],
  ['+set-member-status', 'PATCH'],
  ['+set-member-role', 'PATCH'],
  ['+remove-member', 'DELETE'],
  ['+batch-create-sandboxes', 'POST'],
  ['+update-sandbox', 'PUT'],
  ['+set-sandbox-enabled', 'PATCH'],
  ['+start-sandbox', 'POST'],
  ['+stop-sandbox', 'POST'],
  ['+bind-sandbox-user', 'POST'],
  ['+unbind-sandbox-user', 'DELETE'],
  ['+remove-sandbox', 'DELETE'],
  ['+set-system-model-enabled', 'PATCH'],
  ['+set-model-sync-settings', 'PATCH'],
  ['+set-company-model-enabled', 'PATCH'],
  ['+set-default-model', 'POST'],
  ['+clear-default-model', 'DELETE'],
  ['+set-balance-alert', 'PATCH'],
  ['+create-quota-rule', 'POST'],
  ['+update-quota-rule', 'PATCH'],
  ['+remove-quota-rule', 'DELETE'],
  ['+bind-quota-rule-user', 'POST'],
  ['+create-channel', 'POST'],
  ['+update-channel', 'PATCH'],
  ['+remove-channel', 'DELETE'],
  ['channel verify', 'POST'],
  ['channel routing set', 'PUT'],
  ['channel whatsapp-web start', 'POST'],
  ['channel whatsapp-web unlink', 'DELETE'],
  ['channel binding bind-feishu', 'PUT'],
  ['channel binding unbind', 'DELETE'],
  ['channel binding set-agent', 'PUT'],
  ['+bind-feishu-users', 'PUT'],
  ['+upload-sandbox-tool', 'POST'],
  ['+npm-install', 'POST'],
  ['+sync-sandbox-tools', 'POST'],
  ['+set-sandbox-tool-enabled', 'PATCH'],
  ['+remove-sandbox-tool', 'DELETE'],
  ['+activate-sandbox-tools', 'POST'],
  ['+deactivate-sandbox-tools', 'POST'],
  ['+refresh-sandbox-tool-status', 'POST'],
]);
const VERSIONED_CHANNEL_COMMANDS = new Set([
  '+list-channels',
  'channel get',
  '+create-channel',
  '+update-channel',
  '+remove-channel',
  'channel verify',
  'channel routing get',
  'channel routing set',
  'channel whatsapp-web status',
  'channel whatsapp-web start',
  'channel whatsapp-web unlink',
  'channel binding list',
  'channel binding bind-feishu',
  'channel binding unbind',
  'channel binding set-agent',
  '+bind-feishu-users',
]);

function createContext(values: Record<string, unknown>): RuntimeContext {
  const get = (name: string) => values[name];
  return {
    str: (name) => String(get(name) ?? ''),
    num: (name) => Number(get(name) ?? 0),
    optionalNum: (name) => {
      const value = get(name);
      return value === undefined || value === null || value === '' ? undefined : Number(value);
    },
    bool: (name) => Boolean(get(name)),
    json: (name) => get(name),
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => 'token',
    host: () => 'https://example.test',
    mcpUrl: () => undefined,
    service: () => 'system',
    out: async () => undefined,
  };
}

const defaultValues: Record<string, unknown> = {
  id: 'resource/1',
  'user-id': 'user-1',
  'open-id': 'ou_1',
  'model-id': 'model-1',
  role: 'agent_admin',
  enabled: true,
  threshold: '100',
  description: 'System test',
  members: '[{"openId":"ou_1"}]',
  'user-ids': '["user-1"]',
  'biz-type': 'AE_AGENT',
  'start-date': '2026-07-01',
  'end-date': '2026-07-24',
  'group-by': 'user',
  'sort-by': 'totalTokens',
  'sort-dir': 'desc',
  rule: '{"name":"Daily quota","subjectType":"USER","periodType":"DAY"}',
  channel: '{"name":"Ops","type":"slack","config":{"botToken":"secret","appToken":"secret-2"}}',
  'endpoint-id': 'endpoint-1',
  'channel-id': 'channel-1',
  'te-user-id': 'user-1',
  'binding-id': 'binding-1',
  'union-id': 'on_1',
  'agent-id': 'agent-1',
  'private-only': false,
  bindings: '[{"te_user_id":"user-1","open_id":"ou_1","union_id":"on_1"}]',
  'default-agent-id': '',
  routing: '{"status":"enabled","default_handler":null,"targets":[]}',
  path: '/tmp/example-tool',
  package: 'eslint@9.32.0',
  name: 'eslint',
  manifest: '',
  'allow-scripts': false,
  'new-system-models-enabled-by-default': true,
  refresh: false,
  'parent-dimension': 'user',
  scope: 'drill',
  date: '',
  output: '/tmp/ae-cli-system-usage.csv',
  'target-mode': 'selected',
  'sandbox-ids': '["sandbox-1"]',
  'tool-ids': '["tool-1"]',
  'command-names-by-tool-id': '',
  'expected-tool-snapshots-by-id': '',
  action: 'activate',
  operator: '',
  'sort-order': 'desc',
};

assert.equal(systemCommands.length, 71);
assert.equal(new Set(systemCommands.map(commandKey)).size, 71);

for (const command of systemCommands) {
  const key = commandKey(command);
  assert.equal(command.service, 'system', `${command.command} must use the system domain`);
  assert.ok(command.description.trim(), `${command.command} must have a description`);
  assert.ok(
    command.flags.every((flag) => flag.desc.trim()),
    `${command.command} must describe every flag`,
  );
  assert.equal(
    command.risk === 'high-risk-write',
    EXPECTED_HIGH_RISK.has(key),
    `${key} has an unexpected risk level`,
  );

  const ctx = createContext({
    ...defaultValues,
    ...(command.command === '+update-channel'
      ? { channel: '{"enabled":false,"config":{"botToken":"secret"}}' }
      : {}),
    ...(['+get-usage-combinations', '+export-usage-details'].includes(command.command)
      ? { 'model-id': '', 'model-scope': '', 'app-type': '', date: '' }
      : {}),
  });
  command.validate?.(ctx);
  const preview = await command.dryRun?.(ctx);
  assert.ok(preview && 'url' in preview, `${command.command} must provide a dry-run preview`);
  if (VERSIONED_CHANNEL_COMMANDS.has(key)) {
    assert.match(String(preview.url), /^\/api\/cli\/channel\/v1(?:\/|\?|$)/);
  } else {
    assert.match(String(preview.url), /^\/api\/admin(?:\/|\?|$)/);
  }
  assert.doesNotMatch(String(preview.url), /^\/api\/internal\/sandboxes(?:\/|\?|$)/);
  if (String(preview.url).startsWith('/api/admin/members?')) {
    assert.doesNotMatch(String(preview.url), /(?:^|[?&])openId=/);
  }
  assert.equal(
    preview.method,
    WRITE_METHODS.get(key) ?? 'GET',
    `${key} uses an unexpected HTTP method`,
  );
}

const listMembers = systemCommands.find((command) => command.command === '+list-members');
const memberPreview = await listMembers?.dryRun?.(
  createContext({
    status: 'enabled',
    page: 2,
    'page-size': 50,
    'sort-field': 'periodUsedAmount',
    'sort-dir': 'asc',
  }),
);
assert.equal(
  memberPreview && 'url' in memberPreview ? memberPreview.url : undefined,
  '/api/admin/members?status=enabled&page=2&pageSize=50&sortField=periodUsedAmount&sortDir=asc',
);

const usageDetails = systemCommands.find((command) => command.command === '+get-usage-details');
const usagePreview = await usageDetails?.dryRun?.(createContext(defaultValues));
assert.match(
  String(usagePreview && 'url' in usagePreview ? usagePreview.url : ''),
  /groupBy=user/,
);

const usageSummary = systemCommands.find((command) => command.command === '+get-usage-summary');
const refreshedSummary = await usageSummary?.dryRun?.(
  createContext({ 'start-date': '2026-07-01', 'end-date': '2026-07-24', refresh: true }),
);
assert.match(String(refreshedSummary && 'url' in refreshedSummary ? refreshedSummary.url : ''), /refresh=true/);

const memberStats = systemCommands.find((command) => command.command === '+get-member-stats');
const memberStatsPreview = await memberStats?.dryRun?.(
  createContext({ 'user-id': 'user/1', days: 7 }),
);
assert.equal(
  memberStatsPreview && 'url' in memberStatsPreview ? memberStatsPreview.url : undefined,
  '/api/admin/members/user%2F1/stats?days=7',
);

const usageCombinations = systemCommands.find((command) => command.command === '+get-usage-combinations');
assert.throws(
  () => usageCombinations?.validate?.(createContext({
    'start-date': '2026-07-01',
    'end-date': '2026-07-24',
    'parent-dimension': 'model',
    'model-id': 'model-1',
  })),
  /requires only --model-id and --model-scope/,
);

const activateTools = systemCommands.find((command) => command.command === '+activate-sandbox-tools');
const activatePreview = await activateTools?.dryRun?.(createContext({
  'target-mode': 'selected',
  'sandbox-ids': '["sandbox-1"]',
  'tool-ids': '["tool-1"]',
  'command-names-by-tool-id': '{"tool-1":["ae-cli"]}',
}));
assert.deepEqual(
  activatePreview && 'body' in activatePreview ? activatePreview.body : undefined,
  {
    target: { mode: 'selected', sandboxIds: ['sandbox-1'] },
    toolIds: ['tool-1'],
    commandNamesByToolId: { 'tool-1': ['ae-cli'] },
  },
);
assert.throws(
  () => activateTools?.validate?.(createContext({
    'target-mode': 'all-running',
    'sandbox-ids': '["sandbox-1"]',
    'tool-ids': '["tool-1"]',
  })),
  /all-running mode does not accept --sandbox-ids/,
);

const channelCreate = systemCommands.find((command) => command.command === '+create-channel');
assert.equal(channelCreate?.flags.find((flag) => flag.name === 'channel')?.sensitive, true);
const channelPreview = await channelCreate?.dryRun?.(createContext(defaultValues));
const channelBody =
  channelPreview && 'body' in channelPreview
    ? channelPreview.body as { config?: Record<string, unknown> }
    : undefined;
assert.equal(channelPreview && 'url' in channelPreview ? channelPreview.url : undefined, '/api/cli/channel/v1/channels');
assert.equal(channelBody?.config?.bot_token, '***');
assert.equal(channelBody?.config?.app_token, '***');
assert.equal(channelBody?.config?.botToken, undefined);
assert.doesNotMatch(JSON.stringify(channelPreview), /secret-2?/);

const channelCreateCases = [
  { type: 'feishu', config: { app_id: 'app', app_secret: 'secret' } },
  { type: 'lark', config: { app_id: 'app', app_secret: 'secret' } },
  { type: 'slack', config: { bot_token: 'secret', app_token: 'secret-2' } },
  { type: 'discord', config: { bot_token: 'secret' } },
  {
    type: 'dingtalk',
    config: { client_id: 'client', client_secret: 'secret', corp_id: 'corp' },
  },
  { type: 'wecom', config: { bot_id: 'bot', bot_secret: 'secret' } },
  { type: 'mattermost', config: { server_url: 'https://chat.example.test', bot_token: 'secret' } },
  { type: 'google_chat', config: { service_account_json: '{"type":"service_account"}' } },
  { type: 'whatsapp' },
] as const;
for (const channelCase of channelCreateCases) {
  const preview = await channelCreate?.dryRun?.(
    createContext({
      channel: JSON.stringify({ name: `${channelCase.type} channel`, ...channelCase }),
    }),
  );
  assert.equal(preview && 'url' in preview ? preview.url : undefined, '/api/cli/channel/v1/channels');
  assert.equal(
    preview && 'body' in preview ? (preview.body as { type?: string }).type : undefined,
    channelCase.type,
  );
  assert.doesNotMatch(JSON.stringify(preview), /"secret(?:-2)?"/);
}
const googleChatPreview = await channelCreate?.dryRun?.(
  createContext({
    channel: JSON.stringify({
      name: 'Google Chat',
      type: 'google_chat',
      config: { service_account_json: '{"private_key":"test-private-key"}' },
    }),
  }),
);
assert.equal(
  googleChatPreview && 'body' in googleChatPreview
    ? (googleChatPreview.body as { config: Record<string, unknown> }).config.service_account_json
    : undefined,
  '***',
);
assert.doesNotMatch(JSON.stringify(googleChatPreview), /test-private-key/);
assert.throws(
  () => channelCreate?.dryRun?.(
    createContext({
      channel: JSON.stringify({
        name: 'WeCom OAuth',
        type: 'wecom',
        config: { bot_id: 'bot', bot_secret: 'secret', oauth_enabled: true },
      }),
    }),
  ),
  /--channel.config.corp_id is required when oauth_enabled is true for wecom/,
);
assert.throws(
  () => channelCreate?.dryRun?.(
    createContext({
      channel: JSON.stringify({
        name: 'Mattermost OAuth',
        type: 'mattermost',
        config: {
          server_url: 'https:\/\/chat.example.test',
          bot_token: 'secret',
          oauth_enabled: true,
        },
      }),
    }),
  ),
  /--channel.config.client_id is required when oauth_enabled is true for mattermost/,
);

const tempRoot = mkdtempSync(join(tmpdir(), 'ae-cli-system-domain-'));
try {
  const membersPath = join(tempRoot, 'members.json');
  writeFileSync(membersPath, '[{"openId":"ou_from_file"}]');
  const addMembers = systemCommands.find((command) => command.command === '+add-members');
  const filePreview = await addMembers?.dryRun?.(
    createContext({ ...defaultValues, members: `@${membersPath}` }),
  );
  assert.equal(
    JSON.stringify(
      filePreview && 'body' in filePreview
        ? (filePreview.body as { members: unknown }).members
        : undefined,
    ),
    '[{"openId":"ou_from_file"}]',
  );

  const channelPath = join(tempRoot, 'channel.json');
  writeFileSync(
    channelPath,
    '{"name":"Ops","type":"slack","config":{"botToken":"file-secret","appToken":"file-secret-2"}}',
  );
  const channelFilePreview = await channelCreate?.dryRun?.(
    createContext({ channel: `@${channelPath}` }),
  );
  assert.equal(
    channelFilePreview && 'body' in channelFilePreview
      ? (channelFilePreview.body as { config: Record<string, unknown> }).config.bot_token
      : undefined,
    '***',
  );
  assert.doesNotMatch(JSON.stringify(channelFilePreview), /file-secret/);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

const setMemberRole = systemCommands.find((command) => command.command === '+set-member-role');
assert.throws(
  () => setMemberRole?.validate?.(createContext({ 'user-id': 'user-1', role: 'root' })),
  /--role must be one of: agent_admin, member/,
);

const updateChannel = systemCommands.find((command) => command.command === '+update-channel');
const updateChannelPreview = await updateChannel?.dryRun?.(
  createContext({
    id: 'channel/1',
    channel: '{"systemPrompt":"Updated","unbindUsers":true,"config":{"botToken":"secret"}}',
  }),
);
assert.equal(
  updateChannelPreview && 'url' in updateChannelPreview ? updateChannelPreview.url : undefined,
  '/api/cli/channel/v1/channels/channel%2F1',
);
assert.deepEqual(
  updateChannelPreview && 'body' in updateChannelPreview
    ? updateChannelPreview.body
    : undefined,
  {
    system_prompt: 'Updated',
    unbind_users: true,
    config: { bot_token: '***' },
  },
);
assert.throws(
  () => updateChannel?.dryRun?.(
    createContext({ id: 'channel-1', channel: '{"type":"unsupported"}' }),
  ),
  /--channel.type must be one of/,
);
const sameTypeUpdatePreview = await updateChannel?.dryRun?.(
  createContext({ id: 'channel-1', channel: '{"type":"feishu"}' }),
);
assert.deepEqual(
  sameTypeUpdatePreview && 'body' in sameTypeUpdatePreview
    ? sameTypeUpdatePreview.body
    : undefined,
  { type: 'feishu' },
);

const getChannel = findSystemCommand('channel get');
const getChannelPreview = await getChannel?.dryRun?.(createContext({ id: 'channel/1' }));
assert.equal(
  getChannelPreview && 'url' in getChannelPreview ? getChannelPreview.url : undefined,
  '/api/cli/channel/v1/channels/channel%2F1',
);

const verifyChannel = findSystemCommand('channel verify');
const verifyChannelPreview = await verifyChannel?.dryRun?.(createContext({ id: 'channel/1' }));
assert.equal(
  verifyChannelPreview && 'url' in verifyChannelPreview ? verifyChannelPreview.url : undefined,
  '/api/cli/channel/v1/channels/channel%2F1/verify',
);

const getChannelRouting = findSystemCommand('channel routing get');
const getChannelRoutingPreview = await getChannelRouting?.dryRun?.(
  createContext({ 'endpoint-id': 'endpoint/1' }),
);
assert.equal(
  getChannelRoutingPreview && 'url' in getChannelRoutingPreview
    ? getChannelRoutingPreview.url
    : undefined,
  '/api/cli/channel/v1/endpoints/endpoint%2F1/routing',
);

const setChannelRouting = findSystemCommand('channel routing set');
const setChannelRoutingPreview = await setChannelRouting?.dryRun?.(
  createContext({
    'endpoint-id': 'endpoint/1',
    routing:
      '{"status":"enabled","default_handler":{"kind":"agent","id":"agent-1"},"targets":[]}',
  }),
);
assert.equal(
  setChannelRoutingPreview && 'url' in setChannelRoutingPreview
    ? setChannelRoutingPreview.url
    : undefined,
  '/api/cli/channel/v1/endpoints/endpoint%2F1/routing',
);
assert.equal(
  JSON.stringify(
    setChannelRoutingPreview && 'body' in setChannelRoutingPreview
      ? setChannelRoutingPreview.body
      : undefined,
  ),
  '{"status":"enabled","default_handler":{"kind":"agent","id":"agent-1"},"targets":[]}',
);

for (const [commandName, method] of [
  ['channel whatsapp-web status', 'GET'],
  ['channel whatsapp-web start', 'POST'],
  ['channel whatsapp-web unlink', 'DELETE'],
] as const) {
  const command = findSystemCommand(commandName);
  const preview = await command?.dryRun?.(createContext({ id: 'channel/1' }));
  assert.equal(preview && 'method' in preview ? preview.method : undefined, method);
  assert.equal(
    preview && 'url' in preview ? preview.url : undefined,
    '/api/cli/channel/v1/channels/channel%2F1/whatsapp-web',
  );
}

const listChannelBindings = findSystemCommand('channel binding list');
const listChannelBindingsPreview = await listChannelBindings?.dryRun?.(
  createContext({
    'channel-id': 'channel/1',
    'te-user-id': 'user/1',
    'open-id': 'ou/1',
  }),
);
assert.equal(
  listChannelBindingsPreview && 'url' in listChannelBindingsPreview
    ? listChannelBindingsPreview.url
    : undefined,
  '/api/cli/channel/v1/bindings?channel_id=channel%2F1&te_user_id=user%2F1&open_id=ou%2F1',
);

const bindFeishuUser = findSystemCommand('channel binding bind-feishu');
const bindFeishuUserPreview = await bindFeishuUser?.dryRun?.(
  createContext({
    'channel-id': 'channel/1',
    'te-user-id': 'user/1',
    'open-id': 'ou_1',
    'union-id': 'on_1',
    'endpoint-id': 'endpoint/1',
    'private-only': false,
  }),
);
assert.equal(
  bindFeishuUserPreview && 'url' in bindFeishuUserPreview
    ? bindFeishuUserPreview.url
    : undefined,
  '/api/cli/channel/v1/bindings/feishu',
);
assert.equal(
  JSON.stringify(
    bindFeishuUserPreview && 'body' in bindFeishuUserPreview
      ? bindFeishuUserPreview.body
      : undefined,
  ),
  '{"channel_id":"channel/1","te_user_id":"user/1","open_id":"ou_1","union_id":"on_1","endpoint_id":"endpoint/1"}',
);
const bindFeishuPrivatePreview = await bindFeishuUser?.dryRun?.(
  createContext({
    'channel-id': 'channel-1',
    'te-user-id': 'user-1',
    'open-id': 'ou_1',
    'private-only': true,
  }),
);
assert.equal(
  JSON.stringify(
    bindFeishuPrivatePreview && 'body' in bindFeishuPrivatePreview
      ? bindFeishuPrivatePreview.body
      : undefined,
  ),
  '{"channel_id":"channel-1","te_user_id":"user-1","open_id":"ou_1"}',
);
assert.throws(
  () => bindFeishuUser?.dryRun?.(
    createContext({
      'channel-id': 'channel-1',
      'te-user-id': 'user-1',
      'open-id': 'ou_1',
      'private-only': false,
    }),
  ),
  /--union-id and --endpoint-id are required unless --private-only is true/,
);

const unbindChannelUser = findSystemCommand('channel binding unbind');
const unbindChannelUserPreview = await unbindChannelUser?.dryRun?.(
  createContext({ 'binding-id': 'binding/1' }),
);
assert.equal(
  unbindChannelUserPreview && 'url' in unbindChannelUserPreview
    ? unbindChannelUserPreview.url
    : undefined,
  '/api/cli/channel/v1/bindings/binding%2F1',
);

const setChannelUserAgent = findSystemCommand('channel binding set-agent');
const setChannelUserAgentPreview = await setChannelUserAgent?.dryRun?.(
  createContext({ 'binding-id': 'binding/1', 'agent-id': 'agent/1' }),
);
assert.equal(
  setChannelUserAgentPreview && 'url' in setChannelUserAgentPreview
    ? setChannelUserAgentPreview.url
    : undefined,
  '/api/cli/channel/v1/bindings/binding%2F1/agent',
);
assert.equal(
  JSON.stringify(
    setChannelUserAgentPreview && 'body' in setChannelUserAgentPreview
      ? setChannelUserAgentPreview.body
      : undefined,
  ),
  '{"agent_id":"agent/1"}',
);
const clearChannelUserAgentPreview = await setChannelUserAgent?.dryRun?.(
  createContext({ 'binding-id': 'binding/1', clear: true }),
);
assert.deepEqual(
  clearChannelUserAgentPreview && 'body' in clearChannelUserAgentPreview
    ? clearChannelUserAgentPreview.body
    : undefined,
  { agent_id: null },
);
assert.throws(
  () => setChannelUserAgent?.dryRun?.(
    createContext({ 'binding-id': 'binding/1', 'agent-id': 'agent/1', clear: true }),
  ),
  /Pass exactly one of --agent-id or --clear/,
);

const batchRequests: Array<{ path: string; body: unknown; host: string }> = [];
const batchCommand = createBindFeishuUsersCommand({
  put: async (path, body, host) => {
    batchRequests.push({ path, body, host: host ?? '' });
    const record = body as { te_user_id?: string; agent_id?: string };
    if (record.te_user_id === 'user-2') {
      throw Object.assign(new Error('Synthetic binding failure'), { code: 'synthetic_failure' });
    }
    if (path.endsWith('/agent')) {
      return { ok: true, data: { binding_id: path.split('/').at(-2), agent_id: record.agent_id } };
    }
    return {
      ok: true,
      data: {
        binding_id: `binding-${record.te_user_id}`,
        group_routing_ready: true,
      },
    };
  },
});
const batchContext = createContext({
  'channel-id': 'channel-1',
  'endpoint-id': 'endpoint-1',
  bindings: JSON.stringify([
    { te_user_id: 'user-1', open_id: 'ou_1', union_id: 'on_1' },
    { te_user_id: 'user-2', open_id: 'ou_2', union_id: 'on_2' },
    { te_user_id: 'user-3', open_id: 'ou_3', union_id: 'on_3', agent_id: 'agent-special' },
  ]),
  'default-agent-id': 'agent-default',
  'private-only': false,
});
const batchPreview = await batchCommand.dryRun?.(batchContext);
assert.equal(batchPreview && 'url' in batchPreview ? batchPreview.url : undefined, '/api/cli/channel/v1/bindings/feishu');
assert.equal(
  batchPreview && 'body' in batchPreview
    ? (batchPreview.body as { bindings: unknown[] }).bindings.length
    : undefined,
  3,
);
const batchResult = await batchCommand.execute(batchContext) as {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<Record<string, unknown>>;
};
assert.deepEqual(
  { total: batchResult.total, succeeded: batchResult.succeeded, failed: batchResult.failed },
  { total: 3, succeeded: 2, failed: 1 },
);
assert.equal(batchResult.results[0]?.status, 'succeeded');
assert.equal(batchResult.results[0]?.agent_id, 'agent-default');
assert.equal(batchResult.results[1]?.status, 'failed');
assert.equal(batchResult.results[1]?.stage, 'binding');
assert.equal(batchResult.results[2]?.agent_id, 'agent-special');
assert.equal(batchRequests.length, 5);
assert.deepEqual(
  batchRequests.filter((request) => request.path.endsWith('/agent')).map((request) => request.body),
  [{ agent_id: 'agent-default' }, { agent_id: 'agent-special' }],
);

const assignmentFailureRequests: Array<{ path: string; body: unknown }> = [];
const assignmentFailureCommand = createBindFeishuUsersCommand({
  put: async (path, body) => {
    assignmentFailureRequests.push({ path, body });
    if (path.endsWith('/agent')) {
      throw Object.assign(new Error('Synthetic Agent assignment failure'), { status: 409 });
    }
    return { ok: true, data: { binding_id: 'binding-assignment-failure' } };
  },
});
const assignmentFailureResult = await assignmentFailureCommand.execute(createContext({
  'channel-id': 'channel-1',
  'endpoint-id': 'endpoint-1',
  bindings: JSON.stringify([
    { te_user_id: 'user-1', open_id: 'ou_1', union_id: 'on_1', agent_id: 'agent-1' },
  ]),
  'private-only': false,
})) as { failed: number; results: Array<Record<string, unknown>> };
assert.equal(assignmentFailureResult.failed, 1);
assert.equal(assignmentFailureResult.results[0]?.stage, 'agent_assignment');
assert.equal(assignmentFailureResult.results[0]?.binding_id, 'binding-assignment-failure');
assert.equal(
  (assignmentFailureResult.results[0]?.error as Record<string, unknown>)?.status,
  409,
);
assert.equal(assignmentFailureRequests.length, 2);

const privateOnlyRequests: Array<{ path: string; body: unknown }> = [];
const privateOnlyCommand = createBindFeishuUsersCommand({
  put: async (path, body) => {
    privateOnlyRequests.push({ path, body });
    return { ok: true, data: { binding_id: 'binding-private', group_routing_ready: false } };
  },
});
const privateOnlyContext = createContext({
  'channel-id': 'channel-private',
  bindings: JSON.stringify([{ te_user_id: 'user-private', open_id: 'ou_private' }]),
  'private-only': true,
});
const privateOnlyPreview = await privateOnlyCommand.dryRun?.(privateOnlyContext);
assert.deepEqual(
  privateOnlyPreview && 'body' in privateOnlyPreview ? privateOnlyPreview.body : undefined,
  {
    channel_id: 'channel-private',
    private_only: true,
    bindings: [{ te_user_id: 'user-private', open_id: 'ou_private' }],
  },
);
const privateOnlyResult = await privateOnlyCommand.execute(privateOnlyContext) as {
  succeeded: number;
  results: Array<Record<string, unknown>>;
};
assert.equal(privateOnlyResult.succeeded, 1);
assert.equal(privateOnlyResult.results[0]?.group_routing_ready, false);
assert.equal(privateOnlyRequests.length, 1);
assert.deepEqual(privateOnlyRequests[0]?.body, {
  channel_id: 'channel-private',
  te_user_id: 'user-private',
  open_id: 'ou_private',
});

let invalidBatchRequestCount = 0;
const invalidBatchCommand = createBindFeishuUsersCommand({
  put: async () => {
    invalidBatchRequestCount += 1;
    return { ok: true, data: { binding_id: 'unexpected' } };
  },
});
await assert.rejects(
  invalidBatchCommand.execute(createContext({
    'channel-id': 'channel-1',
    'endpoint-id': 'endpoint-1',
    bindings: JSON.stringify([
      { te_user_id: 'user-1', open_id: 'ou_1', union_id: 'on_1' },
      { te_user_id: 'user-2', open_id: 'ou_2' },
    ]),
    'private-only': false,
  })),
  /--bindings\[1\]\.union_id is required unless --private-only is true/,
);
assert.equal(invalidBatchRequestCount, 0);

let permissionDeniedRequestCount = 0;
const permissionDeniedCommand = createBindFeishuUsersCommand({
  put: async () => {
    permissionDeniedRequestCount += 1;
    throw new PermissionError('Synthetic permission denial', 'admin_required');
  },
});
await assert.rejects(
  permissionDeniedCommand.execute(createContext({
    'channel-id': 'channel-1',
    'endpoint-id': 'endpoint-1',
    bindings: JSON.stringify([
      { te_user_id: 'user-1', open_id: 'ou_1', union_id: 'on_1' },
      { te_user_id: 'user-2', open_id: 'ou_2', union_id: 'on_2' },
    ]),
    'private-only': false,
  })),
  PermissionError,
);
assert.equal(permissionDeniedRequestCount, 1);

let expiredAuthRequestCount = 0;
const expiredAuthCommand = createBindFeishuUsersCommand({
  put: async () => {
    expiredAuthRequestCount += 1;
    throw new TeAgentApiError('Synthetic expired session', 401, 'auth_expired');
  },
});
await assert.rejects(
  expiredAuthCommand.execute(createContext({
    'channel-id': 'channel-1',
    'endpoint-id': 'endpoint-1',
    bindings: JSON.stringify([
      { te_user_id: 'user-1', open_id: 'ou_1', union_id: 'on_1' },
      { te_user_id: 'user-2', open_id: 'ou_2', union_id: 'on_2' },
    ]),
    'private-only': false,
  })),
  (error: unknown) => error instanceof TeAgentApiError && error.status === 401,
);
assert.equal(expiredAuthRequestCount, 1);

assert.throws(
  () => batchCommand.dryRun?.(
    createContext({
      'channel-id': 'channel-1',
      'endpoint-id': 'endpoint-1',
      bindings: JSON.stringify(
        Array.from({ length: 101 }, (_, index) => ({
          te_user_id: `user-${index}`,
          open_id: `ou_${index}`,
          union_id: `on_${index}`,
        })),
      ),
      'private-only': false,
    }),
  ),
  /--bindings must contain between 1 and 100 items/,
);

process.stdout.write('system domain tests passed\n');
