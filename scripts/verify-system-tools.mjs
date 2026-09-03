#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { closeSync, openSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SYSTEM_DIR = 'src/commands/te-system';
const EXPECTED_COMMANDS = [
  '+list-member-candidates',
  '+list-members',
  '+add-members',
  '+set-member-status',
  '+set-member-role',
  '+remove-member',
  '+get-member-stats',
  '+list-sandboxes',
  '+get-sandbox-config',
  '+batch-create-sandboxes',
  '+update-sandbox',
  '+set-sandbox-enabled',
  '+start-sandbox',
  '+stop-sandbox',
  '+list-sandbox-users',
  '+bind-sandbox-user',
  '+unbind-sandbox-user',
  '+remove-sandbox',
  '+list-system-models',
  '+set-system-model-enabled',
  '+get-model-sync-settings',
  '+set-model-sync-settings',
  '+get-system-model-price-rules',
  '+list-company-models',
  '+set-company-model-enabled',
  '+get-default-models',
  '+set-default-model',
  '+clear-default-model',
  '+get-usage-summary',
  '+get-usage-details',
  '+get-agent-tool-calls',
  '+get-usage-combinations',
  '+export-usage',
  '+export-usage-details',
  '+get-cost-summary',
  '+get-balance',
  '+list-over-limit-users',
  '+get-balance-alert',
  '+set-balance-alert',
  '+list-quota-rules',
  '+create-quota-rule',
  '+update-quota-rule',
  '+remove-quota-rule',
  '+bind-quota-rule-user',
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
  '+bind-feishu-users',
  'channel binding unbind',
  'channel binding set-agent',
  '+upload-sandbox-tool',
  '+npm-install',
  '+list-sandbox-tools',
  '+sync-sandbox-tools',
  '+get-sandbox-tool-distribution',
  '+set-sandbox-tool-enabled',
  '+remove-sandbox-tool',
  '+activate-sandbox-tools',
  '+deactivate-sandbox-tools',
  '+refresh-sandbox-tool-status',
  '+list-sandbox-tool-operations',
];

let failed = false;

function fail(message) {
  failed = true;
  process.stderr.write(`✗ ${message}\n`);
}

function ok(message) {
  process.stdout.write(`✓ ${message}\n`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const file = join(dir, entry);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

const discovered = [];
for (const file of walk(SYSTEM_DIR).filter((entry) => entry.endsWith('.ts'))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/command:\s*['"](\+[a-z][a-z0-9-]*)['"]/g)) {
    discovered.push({ name: match[1], file });
  }
  for (const match of source.matchAll(/createSandboxToolOperationCommand\(\s*['"](\+[a-z][a-z0-9-]*)['"]/g)) {
    discovered.push({ name: match[1], file });
  }
  for (const match of source.matchAll(
    /resource:\s*['"]([a-z][a-z0-9 -]*)['"][\s\S]{0,120}?command:\s*['"]([a-z][a-z0-9-]*)['"]/g,
  )) {
    discovered.push({ name: `${match[1]} ${match[2]}`, file });
  }
}

const names = discovered.map((entry) => entry.name);
const uniqueNames = new Set(names);
if (uniqueNames.size !== names.length) {
  const seen = new Set();
  for (const entry of discovered) {
    if (seen.has(entry.name)) fail(`Duplicate command ${entry.name} in ${entry.file}`);
    seen.add(entry.name);
  }
} else {
  ok('System command names are unique');
}

const missing = EXPECTED_COMMANDS.filter((name) => !uniqueNames.has(name));
const unexpected = names.filter((name) => !EXPECTED_COMMANDS.includes(name));
if (missing.length || unexpected.length) {
  if (missing.length) fail(`Missing commands: ${missing.join(', ')}`);
  if (unexpected.length) fail(`Unexpected commands: ${unexpected.join(', ')}`);
} else {
  ok(`System command set matches the expected ${EXPECTED_COMMANDS.length} commands`);
}

const sharedSource = readFileSync(join(SYSTEM_DIR, 'shared.ts'), 'utf8');
if (
  !sharedSource.includes("path.startsWith('/api/admin/')")
  || !sharedSource.includes('assertAdminPath(request.path)')
) {
  fail('Shared system transport must reject non-/api/admin paths');
} else {
  ok('System transport enforces the /api/admin boundary');
}
if (
  !sharedSource.includes("path.startsWith('/api/cli/channel/v1/')")
  || !sharedSource.includes('createSignedCommand(config, assertCliChannelPath)')
) {
  fail('Channel transport must reject non-/api/cli/channel/v1 paths');
} else {
  ok('Channel transport enforces the /api/cli/channel/v1 boundary');
}

const skillSource = readFileSync('skills/ae-system/SKILL.md', 'utf8');
if (
  !skillSource.includes('`root` or `agent_admin`')
  || !skillSource.includes('HTTP 403')
  || !skillSource.includes('Do not retry')
) {
  fail('ae-system must document the admin-only permission boundary and 403 behavior');
} else {
  ok('ae-system documents the root/agent_admin permission boundary');
}

const missingFromSkill = EXPECTED_COMMANDS.filter((name) => !skillSource.includes(`\`${name}\``));
if (missingFromSkill.length) {
  fail(`Commands missing from ae-system Skill: ${missingFromSkill.join(', ')}`);
} else {
  ok('ae-system Skill documents all expected commands');
}
if (!skillSource.includes('ae-cli system <resource> <action> [options]')) {
  fail('ae-system Skill must document resource/action invocation');
} else {
  ok('ae-system Skill documents resource/action invocation');
}

const channelReferenceSource = readFileSync(
  'skills/ae-system/references/channel-management.md',
  'utf8',
);
const requiredChannelWorkflowSnippets = [
  'Feishu OpenAPI MCP',
  'current session must have the Feishu OpenAPI MCP mounted',
  'same App ID and App Secret',
  '`contact:user.id:readonly`',
  '`contact.v3.users.batchGetId`',
  '`user_id_type=open_id`',
  '`user_id_type=union_id`',
  '`user_list[].user_id`',
  'never choose the first result or infer a person from ordering',
  'If the Feishu OpenAPI MCP cannot return a `union_id`, stop.',
  'Ask whether the user explicitly accepts `--private-only`',
  "member's `openId` as `te_user_id`",
  '"enabled":true',
  '"enabled":false',
  '`webhook_url`',
  '`runtime_status="error"`',
  'channel binding set-agent --binding-id <binding-id> --clear',
  'PUT `/api/cli/channel/v1/bindings/feishu`',
  '`channel_id` identifies the one target Feishu channel for the request',
  '`endpoint_id` must identify a verified endpoint that belongs to the same `channel_id`',
  '`agent_id` is not part of this request body',
  'PUT `/api/cli/channel/v1/bindings/{binding_id}/agent`',
  'Run separate confirmed batches for different channels.',
  'sends one binding PUT per person',
  'The binding response returns:',
  '`binding_id` | The channel-user binding ID used for later Agent assignment or maintenance.',
  '`group_routing_ready` | Whether this binding is ready for group routing.',
  'The phase-2 confirmation also authorizes the listed sandbox readiness writes.',
  'Only users whose channel binding succeeded proceed to sandbox readiness.',
  '`boundUsers[].userId`',
  'ae-cli system +get-sandbox-config',
  'ae-cli --dry-run system +batch-create-sandboxes',
  'ae-cli --dry-run system +set-sandbox-enabled',
  '`enabled === true`',
  '`channel_bound_sandbox_not_ready`',
  'Do not roll back a successful channel binding when sandbox preparation fails.',
  '`sandboxQuota.cluster.remaining`',
  '`sandboxQuota.active.remaining`',
  'A result with `binding_id` and `stage: "agent_assignment"` still proceeds to sandbox readiness.',
  'run a fresh `+set-sandbox-enabled` dry-run and obtain supplemental explicit confirmation',
  'When member addition is required, phase 2 has a prerequisite member-add confirmation and a final binding-and-sandbox confirmation.',
  'A sandbox preflight failure does not cancel a confirmed channel binding.',
  '`sandbox_readiness_blocked`',
];
const missingChannelWorkflowSnippets = requiredChannelWorkflowSnippets.filter(
  (snippet) => !channelReferenceSource.includes(snippet),
);
if (missingChannelWorkflowSnippets.length) {
  fail(`Channel workflow is missing: ${missingChannelWorkflowSnippets.join(', ')}`);
} else {
  ok('Channel workflow documents identity, lifecycle, runtime, and Agent-clear contracts');
}

const larkCliChannelSources = [
  ['skills/ae-system/SKILL.md', skillSource],
  ['skills/ae-system/references/channel-management.md', channelReferenceSource],
].filter(([, source]) => source.includes('lark-cli'));
if (larkCliChannelSources.length) {
  fail(
    `ae-system channel identity resolution must use Feishu OpenAPI MCP; remove lark-cli from: ${larkCliChannelSources
      .map(([path]) => path)
      .join(', ')}`,
  );
} else {
  ok('ae-system channel identity resolution uses Feishu OpenAPI MCP');
}

function runCli(args) {
  return execFileSync(
    'npx',
    ['tsx', 'src/index.ts', '--no-update-check', ...args],
    { encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
}

function runCliHelp(args) {
  const outputPath = join(tmpdir(), `ae-cli-system-help-${process.pid}-${Date.now()}.txt`);
  let outputFd;
  try {
    outputFd = openSync(outputPath, 'w');
    execFileSync(
      'npx',
      ['tsx', 'src/index.ts', '--no-update-check', ...args],
      { timeout: 30_000, stdio: ['ignore', outputFd, 'pipe'] },
    );
    closeSync(outputFd);
    outputFd = undefined;
    return readFileSync(outputPath, 'utf8');
  } finally {
    if (outputFd !== undefined) closeSync(outputFd);
    rmSync(outputPath, { force: true });
  }
}

try {
  const help = runCliHelp(['system', '--help']);
  const topLevelExpected = EXPECTED_COMMANDS.filter((name) => name.startsWith('+'));
  const missingFromHelp = topLevelExpected.filter((name) => !help.includes(name));
  if (!help.includes('channel')) missingFromHelp.push('channel');
  if (missingFromHelp.length) {
    fail(`Commands missing from system --help: ${missingFromHelp.join(', ')}`);
  } else {
    const nestedByParent = new Map();
    for (const commandPath of EXPECTED_COMMANDS.filter((name) => !name.startsWith('+'))) {
      const segments = commandPath.split(' ');
      const action = segments.pop();
      const parent = segments.join(' ');
      const actions = nestedByParent.get(parent) ?? [];
      actions.push(action);
      nestedByParent.set(parent, actions);
    }
    for (const [parent, actions] of nestedByParent) {
      const parentHelp = runCliHelp(['system', ...parent.split(' '), '--help']);
      for (const action of actions) {
        if (!parentHelp.includes(action)) missingFromHelp.push(`${parent} ${action}`);
      }
    }
    if (missingFromHelp.length) {
      fail(`Commands missing from nested system help: ${missingFromHelp.join(', ')}`);
    } else {
      ok('system help exposes all expected commands and resource actions');
    }
  }
} catch (error) {
  fail(`Unable to run system --help: ${error instanceof Error ? error.message : String(error)}`);
}

const dryRuns = [
  ['system', '+list-members', '--status', 'enabled', '--page', '1'],
  ['system', '+batch-create-sandboxes', '--user-ids', '["user-1"]'],
  ['system', '+set-default-model', '--model-id', 'model-1'],
  ['system', '+get-member-stats', '--user-id', 'user-1', '--days', '7'],
  ['system', '+get-sandbox-config'],
  ['system', '+set-model-sync-settings', '--new-system-models-enabled-by-default', 'true'],
  [
    'system',
    '+get-usage-details',
    '--start-date',
    '2026-07-01',
    '--end-date',
    '2026-07-24',
  ],
  [
    'system',
    '+get-usage-combinations',
    '--start-date',
    '2026-07-01',
    '--end-date',
    '2026-07-24',
    '--parent-dimension',
    'user',
    '--open-id',
    'ou_1',
  ],
  [
    'system',
    '+export-usage',
    '--start-date',
    '2026-07-01',
    '--end-date',
    '2026-07-24',
    '--group-by',
    'user',
    '--output',
    './system-usage.csv',
  ],
  ['system', '+set-balance-alert', '--enabled', 'true', '--threshold', '100'],
  ['system', '+get-balance'],
  [
    'system',
    '+create-channel',
    '--channel',
    '{"name":"Ops","type":"slack","config":{"botToken":"secret","appToken":"secret-2"}}',
  ],
  ['system', 'channel', 'get', '--id', 'channel-1'],
  [
    'system',
    'channel',
    'routing',
    'set',
    '--endpoint-id',
    'endpoint-1',
    '--routing',
    '{"status":"enabled","default_handler":null,"targets":[]}',
  ],
  ['system', 'channel', 'whatsapp-web', 'status', '--id', 'channel-1'],
  [
    'system',
    'channel',
    'binding',
    'bind-feishu',
    '--channel-id',
    'channel-1',
    '--te-user-id',
    'user-1',
    '--open-id',
    'ou_1',
    '--union-id',
    'on_1',
    '--endpoint-id',
    'endpoint-1',
  ],
  [
    'system',
    'channel',
    'binding',
    'set-agent',
    '--binding-id',
    'binding-1',
    '--clear',
  ],
  [
    'system',
    '+bind-feishu-users',
    '--channel-id',
    'channel-1',
    '--endpoint-id',
    'endpoint-1',
    '--bindings',
    '[{"te_user_id":"user-1","open_id":"ou_1","union_id":"on_1"}]',
  ],
  ['system', '+upload-sandbox-tool', '--path', '/tmp/example-tool'],
  ['system', '+npm-install', '--package', 'eslint@9.32.0'],
  ['system', '+list-sandbox-tools'],
  [
    'system',
    '+activate-sandbox-tools',
    '--target-mode',
    'selected',
    '--sandbox-ids',
    '["sandbox-1"]',
    '--tool-ids',
    '["tool-1"]',
  ],
];

for (const args of dryRuns) {
  const commandName = args[1] === 'channel'
    ? args.slice(1, args.findIndex((value) => value.startsWith('--'))).join(' ')
    : args[1];
  try {
    const envelope = JSON.parse(runCli(['--dry-run', ...args]));
    const preview = envelope.data;
    const expectedPrefix = commandName.startsWith('channel ')
      || commandName.includes('channel')
      || commandName.includes('whatsapp')
      || commandName.includes('feishu')
      ? '/api/cli/channel/v1/'
      : '/api/admin/';
    if (!preview || !String(preview.url).startsWith(expectedPrefix)) {
      fail(`${commandName} dry-run escaped the ${expectedPrefix} boundary`);
      continue;
    }
    if (commandName === '+create-channel') {
      if (
        preview.body?.config?.bot_token !== '***'
        || preview.body?.config?.app_token !== '***'
        || JSON.stringify(preview).includes('"secret"')
      ) {
        fail('+create-channel dry-run exposed channel credentials');
        continue;
      }
    }
    ok(`${commandName} dry-run contract is valid`);
  } catch (error) {
    fail(`${commandName} dry-run failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
