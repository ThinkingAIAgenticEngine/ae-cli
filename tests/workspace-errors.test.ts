import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, truncateSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import workspaceCommands from '../src/commands/workspace/index.ts';
import { runCommand } from '../src/framework/runner.ts';
import { logger } from '../src/core/logger.ts';
import type { Command, GlobalOptions } from '../src/framework/types.ts';

const fixtureRoot = mkdtempSync(join(tmpdir(), 'ae-cli-workspace-errors-'));
const host = 'http://workspace-errors.invalid';
const options: GlobalOptions = { host, format: 'json', validate: false, dryRun: true, yes: true };
const previousRuntime = process.env.SANDBOX_RUNTIME_ROOT;
const previousSpace = process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID;
const previousConversation = process.env.TE_AGENT_CONVERSATION_ID;
const basePath = process.env.TE_CLAUDE_BASE_PATH;
const apiPrefix = process.env.AE_API_PREFIX;
const originalFetch = globalThis.fetch;
const missingFile = join(fixtureRoot, 'missing');
const existingFile = join(fixtureRoot, 'existing');
const largeFile = join(fixtureRoot, 'large');

before(() => {
  mkdirSync(join(fixtureRoot, '.ae-config'));
  writeFileSync(join(fixtureRoot, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'cli_test_fixture' }));
  writeFileSync(existingFile, 'fixture');
  writeFileSync(largeFile, '');
  truncateSync(largeFile, 50 * 1024 * 1024 + 1);
  process.env.SANDBOX_RUNTIME_ROOT = fixtureRoot;
  delete process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID;
  delete process.env.TE_AGENT_CONVERSATION_ID;
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;
  mock.method(logger, 'command', () => {});
  mock.method(logger, 'error', () => {});
  mock.method(logger, 'info', () => {});
});

after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    SANDBOX_RUNTIME_ROOT: previousRuntime, TE_AGENT_CURRENT_AGENT_SPACE_ID: previousSpace,
    TE_AGENT_CONVERSATION_ID: previousConversation, TE_CLAUDE_BASE_PATH: basePath, AE_API_PREFIX: apiPrefix,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  mock.restoreAll();
  rmSync(fixtureRoot, { recursive: true, force: true });
});

function command(name: string): Command {
  const result = workspaceCommands.find((item) => [item.resource, item.command].filter(Boolean).join(' ') === name);
  assert.ok(result);
  return result;
}

async function runError(name: string, values: Record<string, unknown>, dryRun = true) {
  const stderr: string[] = [];
  const stdout: string[] = [];
  const exit = new Error('test-only process exit');
  const exitMock = mock.method(process, 'exit', (code?: number) => { assert.equal(code, 1); throw exit; });
  const errMock = mock.method(process.stderr, 'write', (chunk: unknown) => { stderr.push(String(chunk)); return true; });
  const outMock = mock.method(process.stdout, 'write', (chunk: unknown) => { stdout.push(String(chunk)); return true; });
  try {
    await assert.rejects(runCommand(command(name), values, { ...options, dryRun }), (error) => error === exit);
  } finally {
    exitMock.mock.restore();
    errMock.mock.restore();
    outMock.mock.restore();
  }
  assert.equal(stdout.join(''), '', 'failed commands must not emit success data');
  return JSON.parse(stderr.join(''));
}

test('local Workspace validation is classified before requests or mutations', async (t) => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('unexpected network request'); };
  const capability = { workspaceId: 'space-1', version: 0, capabilityType: 'skill', selectedIds: [] };
  const cases: Array<[string, Record<string, unknown>]> = [
    ['list', { type: 'legacy' }],
    ['list', { status: 'INVALID' }],
    ['create', { name: 'Example', type: 'shared' }],
    ['get', {}],
    ['capability set', { ...capability, version: -1 }],
    ['capability set', { ...capability, version: 0.5 }],
    ['capability set', { ...capability, capabilityType: 'invalid' }],
    ['capability set', { ...capability, selectedIds: {} }],
    ['capability set', { ...capability, selectedIds: Array(101).fill('id') }],
    ['capability set', { ...capability, selectedIds: [''] }],
    ['capability set', { ...capability, selectedIds: [1] }],
    ['member add', { workspaceId: 'space-1', userId: 'user-1', role: 'OWNER' }],
    ['member update', { workspaceId: 'space-1', userId: 'user-1', role: 'OWNER' }],
    ['asset upload', { workspaceId: 'space-1', file: missingFile }],
    ['asset upload', { workspaceId: 'space-1', file: largeFile }],
    ['asset download', { workspaceId: 'space-1', path: 'file.txt', output: existingFile }],
  ];
  for (const [index, [name, values]] of cases.entries()) {
    await t.test(`${index + 1}: ${name}`, async () => {
      const envelope = await runError(name, values);
      assert.equal(envelope.ok, false);
      assert.equal(envelope.error.type, 'validation');
      assert.match(envelope.error.message, /[a-z]/i);
      assert.doesNotMatch(envelope.error.message, /[\u4e00-\u9fff]/);
    });
  }
  assert.equal(requests, 0);
});

test('Workspace transport preserves typed errors through the runner', async (t) => {
  const cases = [
    { status: 400, type: 'validation', expected: 'validation' },
    { status: 404, type: 'not_found', expected: 'not_found' },
    { status: 409, type: 'validation', expected: 'validation' },
    { status: 413, type: 'validation', expected: 'validation' },
    { status: 403, type: 'validation', expected: 'permission' },
    { status: 500, type: 'api', expected: 'api' },
    { status: 200, type: 'not_found', expected: 'not_found' },
    { status: 200, type: 'validation', expected: 'validation' },
    { status: 200, type: 'permission', expected: 'permission' },
    { status: 200, type: 'auth', expected: 'auth' },
    { status: 400, type: 'unknown', expected: 'validation' },
    { status: 404, type: undefined, expected: 'not_found' },
    { status: 422, type: undefined, expected: 'validation' },
    { status: 409, type: undefined, expected: 'api' },
    { status: 500, type: 'unknown', expected: 'api' },
  ];
  for (const { status, type, expected } of cases) {
    await t.test(`${status} ${type ?? 'untyped'} -> ${expected}`, async () => {
      const error = {
        type, code: 'WORKSPACE_TEST_ERROR', message: 'The requested Workspace operation failed.',
        hint: 'Check the target and parameters.',
        details: { fieldErrors: { path: ['A safe relative path is required.'] } },
      };
      globalThis.fetch = async (input) => {
        if (String(input).includes('/v1/ta/cli/token/')) return Response.json({ return_code: 0 });
        return Response.json({ ok: false, error }, { status });
      };
      const result = await runError('list', {}, false);
      assert.equal(result.error.type, expected);
      assert.equal(result.error.code, error.code);
      assert.equal(result.error.message, error.message);
      assert.equal(result.error.hint, error.hint);
      if (type && type !== 'unknown') assert.deepEqual(result.error.details, error.details);
    });
  }
});

test('malformed ok:false envelopes fail without echoing untrusted response data', async () => {
  for (const error of [
    { message: 'private response data' },
    { type: 'config', code: 'BAD_TYPE', message: 'private response data' },
    { type: 'validation', code: '', message: 'private response data' },
  ]) {
    globalThis.fetch = async (input) => String(input).includes('/v1/ta/cli/token/')
      ? Response.json({ return_code: 0 })
      : Response.json({ ok: false, error });
    const result = await runError('list', {}, false);
    assert.equal(result.error.type, 'api');
    assert.equal(result.error.code, 'WORKSPACE_INVALID_RESPONSE');
    assert.doesNotMatch(JSON.stringify(result), /private response data/);
  }
});

test('asset download uses the same structured error classification', async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/v1/ta/cli/token/')) return Response.json({ return_code: 0 });
    if (url.includes('/target?')) return Response.json({
      ok: true, data: { agentSpaceId: 'space-1', spaceType: 'personal', role: 'OWNER' },
    });
    return Response.json({
      ok: false, error: { type: 'validation', code: 'INVALID_PATH', message: 'The asset path is invalid.' },
    }, { status: 400 });
  };
  const result = await runError('asset download', { workspaceId: 'space-1', path: '../secret', output: missingFile }, false);
  assert.equal(result.error.type, 'validation');
  assert.equal(result.error.code, 'INVALID_PATH');
});
