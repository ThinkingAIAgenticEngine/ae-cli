import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { baseCommands } from '../src/commands/te-analysis/index.js';
import memberGroupCommands, {
  projectMemberGroupAddMembers,
  projectMemberGroupCreate,
  projectMemberGroupDelete,
  projectMemberGroupList,
  projectMemberGroupMembers,
  projectMemberGroupRemoveMembers,
  projectMemberGroupRename,
} from '../src/commands/te-analysis/project/member-group/index.js';
import { CliValidationError } from '../src/core/errors.js';
import { createRuntimeContext } from '../src/framework/runner.js';
import type { Command } from '../src/framework/types.js';

const directory = mkdtempSync(join(tmpdir(), 'ae-project-member-group-'));
const mockPath = join(directory, 'fetch-mock.mjs');
const requestPath = join(directory, 'requests.ndjson');
const contextPath = join(directory, 'context.json');
writeFileSync(contextPath, JSON.stringify({ intent_source: 'agent_context_file', user_intent: 'Isolated member-group command test' }));
const host = 'https://project-member-group-test.invalid';
const root = new URL('../', import.meta.url);

writeFileSync(mockPath, `
import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url, init) => {
  const parsed = new URL(String(url));
  if (parsed.pathname === '/v1/ta/cli/config') {
    return new Response(JSON.stringify({ return_code: 0, data: { features: {} } }), { status: 200 });
  }
  if (parsed.pathname === '/v1/ta/cli/token/renew') return new Response('{}', { status: 404 });
  const headers = new Headers(init?.headers);
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  appendFileSync(process.env.MEMBER_GROUP_TEST_REQUESTS, JSON.stringify({
    path: parsed.pathname, method: init?.method, body: body ? { input: body.input } : undefined,
    cliToken: headers.get('cli-token'), authorization: headers.get('Authorization'),
  }) + '\\n');
  if (!parsed.pathname.startsWith('/api/cli/analysis/v1/capabilities/')) {
    throw new Error('Unexpected request in isolated member-group test: ' + parsed.pathname);
  }
  const action = parsed.pathname.split('/').at(-2).split('.').at(-1);
  const data = action === 'list' || action === 'members'
    ? { items: [], total: 1201, limit: body.input.limit ?? 100, offset: body.input.offset ?? 0,
        has_more: true, next_offset: (body.input.offset ?? 0) + (body.input.limit ?? 100) }
    : { group_id: 20, group_name: body.input.group_name, requested_user_ids: body.input.user_ids,
        changed_user_ids: body.input.user_ids, member_count: 2 };
  return new Response(JSON.stringify({ ok: true, data,
    meta: { request_id: 'member-group-request', invocation_id: 'member-group-invocation' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
};
`);
process.once('exit', () => rmSync(directory, { recursive: true, force: true }));

interface CapturedRequest {
  path: string;
  method: string;
  body: { input: Record<string, unknown> };
  cliToken: string | null;
  authorization: string | null;
}

function runCli(args: string[]) {
  rmSync(requestPath, { force: true });
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--import', mockPath, 'src/index.ts', '--no-update-check', ...args,
  ], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      HOME: directory,
      AE_CLI_TOKEN: 'cli_test_member_group_token',
      AE_CLI_TOKEN_HOST: host,
      AE_CLI_TOKEN_FILE: '',
      AE_CLI_NO_COMPAT_CHECK: '1',
      MEMBER_GROUP_TEST_REQUESTS: requestPath,
      TA_CLI_CONTEXT_FILE: contextPath,
      NO_COLOR: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.ifError(result.error);
  const requests: CapturedRequest[] = existsSync(requestPath)
    ? readFileSync(requestPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
    : [];
  return { ...result, requests };
}

const cases: Array<{ command: Command; args: string[]; input: Record<string, unknown> }> = [
  { command: projectMemberGroupList, args: ['--project-id', '1'], input: { project_id: 1 } },
  { command: projectMemberGroupMembers, args: ['--project-id', '1', '--group-id', '20'], input: { project_id: 1, group_id: 20 } },
  { command: projectMemberGroupCreate, args: ['--project-id', '1', '--group-name', 'Customer Success'], input: { project_id: 1, group_name: 'Customer Success' } },
  { command: projectMemberGroupRename, args: ['--project-id', '1', '--group-id', '20', '--group-name', 'Customer Success'], input: { project_id: 1, group_id: 20, group_name: 'Customer Success' } },
  { command: projectMemberGroupDelete, args: ['--project-id', '1', '--group-id', '20'], input: { project_id: 1, group_id: 20, yes: true } },
  { command: projectMemberGroupAddMembers, args: ['--project-id', '1', '--group-id', '20', '--user-ids', '[101,102]'], input: { project_id: 1, group_id: 20, user_ids: [101, 102], yes: true } },
  { command: projectMemberGroupRemoveMembers, args: ['--project-id', '1', '--group-id', '20', '--user-ids', '[101,102]'], input: { project_id: 1, group_id: 20, user_ids: [101, 102], yes: true } },
];

await test('all seven commands are registered with business-specific risk and canonical references', () => {
  assert.equal(memberGroupCommands.length, 7);
  const skill = readFileSync(new URL('../skills/ae-analysis/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /Project member groups/);
  assert.match(skill, /distinct from AgentSpace\/system membership and analysis user-cluster\/user-tag audiences/);
  for (const { command } of cases) {
    assert.ok(baseCommands.includes(command));
    assert.equal(command.service, 'project');
    assert.equal(command.resource, 'member-group');
    assert.equal(command.capabilityId, `project.member_group.${command.command.replaceAll('-', '_')}`);
    assert.equal(command.risk, ['list', 'members'].includes(command.command) ? 'read'
      : ['create', 'rename'].includes(command.command) ? 'write' : 'high-risk-write');
    assert.equal(typeof command.dryRun, 'function');
    const reference = readFileSync(new URL(
      `../skills/ae-analysis/references/project_member_group_${command.command.replaceAll('-', '_')}.md`, import.meta.url,
    ), 'utf8');
    assert.ok(reference.includes(`ae-cli project member-group ${command.command}`));
    assert.ok(reference.includes(command.capabilityId!));
    for (const flag of command.flags.filter(flag => flag.required)) assert.ok(reference.includes(`--${flag.name}`));
  }
});

for (const { command, args, input } of cases) {
  await test(`real CLI ${command.command} maps typed flags to one snake_case capability execute`, () => {
    const result = runCli(['project', 'member-group', command.command, ...args,
      ...(command.risk === 'high-risk-write' ? ['--yes'] : [])]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(result.requests.length, 1, JSON.stringify(result.requests));
    assert.equal(result.requests[0].path, `/api/cli/analysis/v1/capabilities/${command.capabilityId}/execute`);
    assert.equal(result.requests[0].method, 'POST');
    assert.deepEqual(result.requests[0].body.input, input);
    assert.equal(result.requests[0].cliToken, 'cli_test_member_group_token');
    assert.equal(result.requests[0].authorization, null);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.meta.request_id, 'member-group-request');
    assert.equal(output.meta.invocation_id, 'member-group-invocation');
    assert.equal(existsSync(join(directory, '.ae-cli/secure-tokens')), false, 'External credentials must not be stored');
  });

  await test(`real CLI ${command.command} dry-run never calls execute and needs no confirmation`, () => {
    const result = runCli(['project', 'member-group', command.command, ...args, '--dry-run']);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(result.requests.length, 1, JSON.stringify(result.requests));
    assert.equal(result.requests[0].path, `/api/cli/analysis/v1/capabilities/${command.capabilityId}/dry-run`);
    assert.deepEqual(result.requests[0].body.input, input);
  });
}

await test('read pagination supports later pages beyond 1000 members', () => {
  for (const command of [projectMemberGroupList, projectMemberGroupMembers]) {
    const result = runCli(['project', 'member-group', command.command, '--project-id', '1',
      ...(command.command === 'members' ? ['--group-id', '20'] : []), '--limit', '1000', '--offset', '1000']);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(result.requests[0].body.input.limit, 1000);
    assert.equal(result.requests[0].body.input.offset, 1000);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.total, 1201);
    assert.equal(output.data.offset, 1000);
    assert.equal(output.data.limit, 1000);
    assert.equal(output.data.has_more, true);
    assert.equal(output.data.next_offset, 2000);
  }
});

await test('membership changes and group deletion require explicit non-interactive confirmation before transport', () => {
  for (const { command, args } of cases.filter(item => item.command.risk === 'high-risk-write')) {
    const result = runCli(['project', 'member-group', command.command, ...args]);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'CONFIRMATION_REQUIRED');
    assert.deepEqual(result.requests, []);
  }
});

function context(command: Command, values: Record<string, unknown>) {
  return createRuntimeContext(command, values, { host, format: 'json', yes: true });
}

await test('all ID, pagination, name, and user-array preflight boundaries reject locally without requests', async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests += 1; throw new Error('Preflight must not call fetch'); };
  const valid = { projectId: 1, groupId: 20, groupName: 'Customer Success', userIds: [101, 102] };
  try {
    for (const { command } of cases) {
      for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2147483648, Number.MAX_SAFE_INTEGER + 1]) {
        const ctx = context(command, { ...valid, projectId: value });
        assert.throws(() => command.preflight!(ctx), CliValidationError, `${command.command} project ID ${value}`);
        await assert.rejects(() => command.dryRun!(ctx), CliValidationError);
      }
      if (command.flags.some(flag => flag.name === 'group-id')) {
        for (const value of [0, -1, 1.5, Number.NaN, 2147483648]) {
          assert.throws(() => command.preflight!(context(command, { ...valid, groupId: value })), CliValidationError);
        }
      }
    }
    for (const command of [projectMemberGroupList, projectMemberGroupMembers]) {
      for (const limit of [0, -1, 1.5, 1001, Number.NaN]) {
        assert.throws(() => command.preflight!(context(command, { ...valid, limit })), CliValidationError);
      }
      for (const offset of [-1, 0.5, 2147483648, Number.NaN]) {
        assert.throws(() => command.preflight!(context(command, { ...valid, offset })), CliValidationError);
      }
      assert.doesNotThrow(() => command.preflight!(context(command, { ...valid, limit: 1000, offset: 0 })));
      assert.doesNotThrow(() => command.preflight!(context(command, { ...valid, limit: 1, offset: 2147483647 })));
    }
    for (const command of [projectMemberGroupCreate, projectMemberGroupRename]) {
      for (const groupName of ['', '   ', '\t', 'a'.repeat(81)]) {
        assert.throws(() => command.preflight!(context(command, { ...valid, groupName })), CliValidationError);
      }
      assert.doesNotThrow(() => command.preflight!(context(command, { ...valid, groupName: 'a'.repeat(80) })));
    }
    for (const command of [projectMemberGroupAddMembers, projectMemberGroupRemoveMembers]) {
      for (const userIds of [[], {}, null, [0], [-1], [1.5], ['101'], [true], [null], [2147483648], [Number.NaN], Array(1001).fill(101)]) {
        assert.throws(() => command.preflight!(context(command, { ...valid, userIds })), CliValidationError);
      }
      assert.doesNotThrow(() => command.preflight!(context(command, { ...valid, userIds: Array.from({ length: 1000 }, (_, i) => i + 1) })));
      assert.doesNotThrow(() => command.preflight!(context(command, { ...valid, userIds: [2147483647] })));
    }
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

await test('real CLI reports invalid member input before confirmation and without any capability transport', () => {
  for (const userIds of ['not-json', '[]', '["101"]', '[0]', '[1.5]']) {
    const result = runCli(['project', 'member-group', 'add-members', '--project-id', '1', '--group-id', '20', '--user-ids', userIds]);
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stderr);
    assert.equal(output.error.type, 'validation');
    assert.notEqual(output.error.code, 'CONFIRMATION_REQUIRED');
    assert.match(output.error.message, /user-ids|JSON/);
    assert.deepEqual(result.requests, []);
  }
});

await test('existing project member entry remains available with its original capability route', () => {
  const result = runCli(['project', 'member', 'list', '--project-id', '1']);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(result.requests.length, 1, JSON.stringify(result.requests));
  assert.equal(result.requests[0].path, '/api/cli/analysis/v1/capabilities/project.member.list/execute');
  assert.deepEqual(result.requests[0].body.input, { project_id: 1 });
});

await test('real CLI help exposes the seven new actions and the existing member commands', () => {
  const help = runCli(['project', 'member-group', '--help']);
  assert.equal(help.status, 0, help.stderr);
  for (const { command } of cases) assert.ok(help.stdout.includes(command.command));
  assert.deepEqual(help.requests, []);
  const addHelp = runCli(['project', 'member-group', 'add-members', '--help']);
  for (const flag of ['--project-id', '--group-id', '--user-ids']) assert.ok(addHelp.stdout.includes(flag));
  assert.match(addHelp.stdout, /dry-run|confirmation|--yes/);
  const oldHelp = runCli(['project', 'member', '--help']);
  for (const action of ['add', 'list', 'remove', 'update', 'import', 'batch-update']) assert.ok(oldHelp.stdout.includes(action));
});
