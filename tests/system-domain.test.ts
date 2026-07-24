import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import systemCommands from '../src/commands/te-system/index.js';
import type { RuntimeContext } from '../src/framework/types.js';

const EXPECTED_HIGH_RISK = new Set([
  '+remove-member',
  '+unbind-sandbox-user',
  '+remove-sandbox',
  '+clear-default-model',
  '+remove-quota-rule',
  '+remove-channel',
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
  ['+set-company-model-enabled', 'PATCH'],
  ['+set-default-model', 'POST'],
  ['+clear-default-model', 'DELETE'],
  ['+set-balance-alert', 'PATCH'],
  ['+create-quota-rule', 'POST'],
  ['+update-quota-rule', 'PATCH'],
  ['+remove-quota-rule', 'DELETE'],
  ['+bind-quota-rule-user', 'POST'],
  ['+create-channel', 'POST'],
  ['+update-channel', 'PUT'],
  ['+remove-channel', 'DELETE'],
  ['+upload-sandbox-tool', 'POST'],
  ['+npm-install', 'POST'],
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
  path: '/tmp/example-tool',
  package: 'eslint@9.32.0',
  name: 'eslint',
  manifest: '',
  'allow-scripts': false,
};

assert.equal(systemCommands.length, 39);
assert.equal(new Set(systemCommands.map((command) => command.command)).size, 39);

for (const command of systemCommands) {
  assert.equal(command.service, 'system', `${command.command} must use the system domain`);
  assert.ok(command.description.trim(), `${command.command} must have a description`);
  assert.ok(
    command.flags.every((flag) => flag.desc.trim()),
    `${command.command} must describe every flag`,
  );
  assert.equal(
    command.risk === 'high-risk-write',
    EXPECTED_HIGH_RISK.has(command.command),
    `${command.command} has an unexpected risk level`,
  );

  const ctx = createContext({
    ...defaultValues,
    ...(command.command === '+update-channel'
      ? { channel: '{"enabled":false,"config":{"botToken":"secret"}}' }
      : {}),
  });
  command.validate?.(ctx);
  const preview = await command.dryRun?.(ctx);
  assert.ok(preview && 'url' in preview, `${command.command} must provide a dry-run preview`);
  assert.match(String(preview.url), /^\/api\/admin(?:\/|\?|$)/);
  assert.equal(
    preview.method,
    WRITE_METHODS.get(command.command) ?? 'GET',
    `${command.command} uses an unexpected HTTP method`,
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

const channelCreate = systemCommands.find((command) => command.command === '+create-channel');
assert.equal(channelCreate?.flags.find((flag) => flag.name === 'channel')?.sensitive, true);
const channelPreview = await channelCreate?.dryRun?.(createContext(defaultValues));
const channelBody =
  channelPreview && 'body' in channelPreview
    ? channelPreview.body as { config?: Record<string, unknown> }
    : undefined;
assert.equal(channelBody?.config?.botToken, '***');
assert.equal(channelBody?.config?.appToken, '***');
assert.doesNotMatch(JSON.stringify(channelPreview), /secret-2?/);

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
      ? (channelFilePreview.body as { config: Record<string, unknown> }).config.botToken
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
assert.throws(
  () => updateChannel?.dryRun?.(
    createContext({ id: 'channel-1', channel: '{"type":"feishu"}' }),
  ),
  /--channel.type cannot be changed/,
);

process.stdout.write('system domain tests passed\n');
