import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import commands, {
  approvalGet, approvalSubmit, approvalApprove, approvalReject, approvalWithdraw,
  approverList, approverAdd, approverDelete,
} from '../../src/commands/te-experiment/index.ts';

const HOST = 'http://localhost';
const configDir = mkdtempSync(join(tmpdir(), 'ae-experiment-approval-'));
const previousConfigDir = process.env.TE_AGENT_CLI_CONFIG_DIR;
writeFileSync(join(configDir, 'cli-token.json'), JSON.stringify({ url: HOST, token: 'cli_test_token' }));
process.env.TE_AGENT_CLI_CONFIG_DIR = configDir;
after(() => {
  rmSync(configDir, { recursive: true, force: true });
  if (previousConfigDir === undefined) delete process.env.TE_AGENT_CLI_CONFIG_DIR;
  else process.env.TE_AGENT_CLI_CONFIG_DIR = previousConfigDir;
});

const proposal = { approval_id: 42, state: 'pending_review', initial_submission: true,
  can_approve: true, can_reject: true, can_cancel: false,
  configuration: { exp_id: 'exp_1', allocation: 20 } };
const cases = [
  [approvalGet, { project_id: 1, exp_id: 'exp_1' }, { item: proposal }],
  [approvalSubmit, { project_id: 1, exp_id: 'exp_1' }, { result: 'exp_1' }],
  [approvalApprove, { project_id: 1, exp_id: 'exp_1', approval_id: 42 }, { result: true }],
  [approvalReject, { project_id: 1, exp_id: 'exp_1', approval_id: 42, reason: 'Reduce traffic' }, { result: true }],
  [approvalWithdraw, { project_id: 1, exp_id: 'exp_1', approval_id: 42 }, { result: true }],
  [approverList, { project_id: 1 }, { items: [{ approver: 'open_1', eligible: true }], total: 1 }],
  [approverAdd, { project_id: 1, approvers: ['open_1', 'open_2'] }, { result: true }],
  [approverDelete, { project_id: 1, approver: 'open_1' }, { result: true }],
];

function context(input) {
  const value = (name) => input[name.replaceAll('-', '_')];
  return {
    str: (name) => String(value(name) ?? ''), num: (name) => Number(value(name) ?? 0),
    json: value, host: () => HOST, service: () => 'experiment',
  };
}

function runCli(args, response = null, status = 200, expectedPath = null) {
  const hook = 'data:text/javascript,' + encodeURIComponent(`
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      if (new URL(url).pathname === '/v1/ta/cli/config') {
        return new Response(JSON.stringify({ data: { versions: {} } }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (${JSON.stringify(expectedPath)} && new URL(url).pathname !== ${JSON.stringify(expectedPath)}) {
        throw new Error('Unexpected gateway path');
      }
      if (++calls > 1) throw new Error('Unexpected retry or approval discovery');
      return new Response(JSON.stringify(${JSON.stringify(response)} ?? {
        ok: true, data: { url: String(url), input: JSON.parse(init.body).input }
      }), { status: ${status}, headers: { 'Content-Type': 'application/json' } });
    };
  `);
  return spawnSync(process.execPath, [
    '--import', 'tsx', '--import', hook, 'src/index.ts', '--no-update-check', ...args,
  ], { encoding: 'utf8', env: { ...process.env, CI: 'true' } });
}

test('real CLI expresses explicit external deadline cancellation and rejects conflicting times', () => {
  const args = ['experiment', 'external-experiment', 'save-submit', '-p', '1',
    '--exp-id', 'ext_1', '--exp-name', 'External deadline update', '--bucket-id', '#user_id',
    '--start-time', '2030-01-01T00:17:29.877+08:00',
    '--groups', JSON.stringify([
      { expGroupId: 'g1', expGroupName: 'control', isControl: 1 },
      { expGroupId: 'g2', expGroupName: 'variant', isControl: 0 },
    ]), '--metrics', JSON.stringify([{ metricId: 'm1', metricRole: 'primary' }])];
  const preview = runCli([...args, '--clear-end-time', 'true', '--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  const request = JSON.parse(preview.stdout).data.input.req;
  assert.equal(request.clearEndTime, true);
  assert.equal(request.startTime, '2030-01-01T00:17:29.877+08:00');
  assert.equal(Object.hasOwn(request, 'endTime'), false);

  const unchanged = runCli([...args, '--clear-end-time', 'false', '--dry-run']);
  assert.equal(unchanged.status, 0, unchanged.stderr);
  assert.equal(Object.hasOwn(JSON.parse(unchanged.stdout).data.input.req, 'clearEndTime'), false);

  const conflict = runCli([...args, '--clear-end-time', 'true',
    '--end-time', '2030-02-01T00:00:00+08:00', '--dry-run'], null, 200, '/no-write-expected');
  assert.equal(conflict.status, 1);
  assert.equal(conflict.stdout, '');
  assert.match(JSON.parse(conflict.stderr).error.message, /cannot be combined/);

  const unsupported = runCli([...args, '--clear-end-time', 'true'], {
    ok: false, error: { type: 'validation', code: 'INVALID_CAPABILITY_INPUT',
      message: 'Unknown field clearEndTime' },
  }, 400, '/api/cli/engage/v1/capabilities/experiment.experiment.save-submit/execute');
  assert.equal(unsupported.status, 1);
  assert.equal(JSON.parse(unsupported.stderr).error.code, 'INVALID_CAPABILITY_INPUT');
});

test('all approval commands register and use the authenticated engage gateway without extra calls', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [command, input, data] of cases) {
      assert.ok(commands.includes(command));
      assert.equal(command.risk, command === approverDelete ? 'high-risk-write'
        : [approvalGet, approverList].includes(command) ? 'read' : 'write');
      for (const [operation, endpoint] of [
        ['validateInput', 'validate'], ['dryRun', 'dry-run'], ['execute', 'execute'],
      ]) {
        const requests = [];
        globalThis.fetch = async (url, init) => {
          requests.push({ url: String(url), method: init.method, headers: init.headers,
            input: JSON.parse(init.body).input });
          return new Response(JSON.stringify({ ok: true, data }), {
            headers: { 'Content-Type': 'application/json' },
          });
        };
        const result = await command[operation](context(input));
        assert.equal(requests.length, 1, `${command.capabilityId} must not substitute a newer approval`);
        assert.equal(requests[0].url,
          `${HOST}/api/cli/engage/v1/capabilities/${command.capabilityId}/${endpoint}`);
        assert.equal(requests[0].method, 'POST');
        assert.deepEqual(requests[0].input, input);
        assert.equal(requests[0].headers['cli-token'], 'cli_test_token');
        assert.equal(requests[0].headers.Authorization, undefined);
        assert.deepEqual(JSON.parse(JSON.stringify(result)), data);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('local validation rejects unsafe IDs, empty reasons, and invalid approver arrays', () => {
  for (const [command, input] of cases) {
    for (const project_id of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1,
      '1.0000000000000001', '0.99999999999999999', '1e0', '0x1']) {
      assert.throws(() => command.validate(context({ ...input, project_id })),
        /--project-id must be a positive safe integer/);
    }
    if ('exp_id' in input) {
      assert.throws(() => command.validate(context({ ...input, exp_id: '  ' })), /--exp-id/);
    }
  }
  for (const command of [approvalApprove, approvalReject, approvalWithdraw]) {
    for (const approval_id of [undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => command.validate(context({ project_id: 1, exp_id: 'exp_1',
        approval_id, reason: 'Rejected' })), /--approval-id/);
    }
  }
  for (const reason of ['', '  ', 'x'.repeat(73), '😀'.repeat(37)]) {
    assert.throws(() => approvalReject.validate(context({ project_id: 1, exp_id: 'exp_1',
      approval_id: 42, reason })), /--reason/);
  }
  assert.doesNotThrow(() => approvalReject.validate(context({ project_id: 1, exp_id: 'exp_1',
    approval_id: 42, reason: ` ${'x'.repeat(72)} ` })));
  for (const approvers of [null, {}, [], [''], ['  '], [1], Array(11).fill('open_1')]) {
    assert.throws(() => approverAdd.validate(context({ project_id: 1, approvers })), /--approvers/);
  }
  assert.doesNotThrow(() => approverAdd.validate(context({ project_id: 1,
    approvers: Array.from({ length: 10 }, (_, i) => `open_${i}`) })));
  assert.throws(() => approverDelete.validate(context({ project_id: 1, approver: '  ' })), /--approver/);
});

test('raw approval ID validation rejects rounding before transport and preserves exact integer boundaries', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body).input);
    return new Response(JSON.stringify({ ok: true, data: { result: true } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    for (const command of [approvalApprove, approvalReject, approvalWithdraw]) {
      for (const operation of ['validateInput', 'dryRun', 'execute']) {
        for (const approval_id of ['41.9999999999999999', '42.0000000000000001',
          '42.0', '4.2e1', '0x2a', '+42', '9007199254740993']) {
          await assert.rejects(command[operation](context({
            project_id: '1', exp_id: 'exp_1', approval_id, reason: 'Review fixture',
          })), /--approval-id must be a positive safe integer/);
        }
      }
    }
    assert.equal(requests.length, 0, 'invalid IDs must not reach the gateway');
    for (const command of [approvalApprove, approvalReject, approvalWithdraw]) {
      for (const [approval_id, expected] of [
        ['1', 1], ['42', 42], ['00042', 42],
        [` ${Number.MAX_SAFE_INTEGER} `, Number.MAX_SAFE_INTEGER],
      ]) {
        await command.dryRun(context({ project_id: '1', exp_id: 'exp_1',
          approval_id, reason: 'Review fixture' }));
        assert.equal(requests.at(-1).approval_id, expected);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('real CLI rejects fractional IDs before validation, preview, execution, and confirmation gates', () => {
  for (const action of ['approve', 'reject', 'withdraw']) {
    for (const mode of [[], ['--validate'], ['--dry-run']]) {
      const rawId = mode.length ? '42.0000000000000001' : '41.9999999999999999';
      const result = runCli(['experiment', 'approval', action, '-p', '1', '--exp-id', 'exp_1',
        '--approval-id', rawId, ...(action === 'reject' ? ['--reason', 'Review fixture'] : []),
        ...mode], null, 200, '/no-capability-request-expected');
      assert.equal(result.status, 1, result.stderr);
      assert.equal(result.stdout, '');
      assert.equal(JSON.parse(result.stderr).error.type, 'validation');
      assert.match(JSON.parse(result.stderr).error.message, /--approval-id must be a positive safe integer/);
    }
  }
  const invalidProject = runCli(['experiment', 'approver', 'delete', '-p', '1.0000000000000001',
    '--approver', 'open_1'], null, 200, '/no-capability-request-expected');
  assert.equal(invalidProject.status, 1);
  assert.equal(invalidProject.stdout, '');
  const error = JSON.parse(invalidProject.stderr).error;
  assert.equal(error.type, 'validation');
  assert.match(error.message, /--project-id must be a positive safe integer/);
  assert.notEqual(error.code, 'CONFIRMATION_REQUIRED');

  const valid = runCli(['experiment', 'approval', 'approve', '-p', '1', '--exp-id', 'exp_1',
    '--approval-id', String(Number.MAX_SAFE_INTEGER), '--dry-run']);
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).data.input.approval_id, Number.MAX_SAFE_INTEGER);
});

test('real CLI maps flags, preserves round IDs, and requires confirmation only for deletion', () => {
  for (const [command, input] of cases) {
    const flags = Object.entries(input).flatMap(([key, value]) => [
      key === 'project_id' ? '-p' : `--${key.replaceAll('_', '-')}`,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
    ]);
    const args = ['experiment', command.resource, command.command, ...flags];
    const preview = runCli([...args, '--dry-run']);
    assert.equal(preview.status, 0, preview.stderr);
    const output = JSON.parse(preview.stdout);
    assert.equal(output.ok, true);
    assert.deepEqual(output.data.input, input);
    assert.equal(output.data.url,
      `${HOST}/api/cli/engage/v1/capabilities/${command.capabilityId}/dry-run`);
    const execution = runCli(command === approverDelete ? [...args, '--yes'] : args);
    assert.equal(execution.status, 0, execution.stderr);
    assert.deepEqual(JSON.parse(execution.stdout).data.input, input);
    assert.equal(JSON.parse(execution.stdout).data.url,
      `${HOST}/api/cli/engage/v1/capabilities/${command.capabilityId}/execute`);
  }
  const blocked = runCli(['experiment', 'approver', 'delete', '-p', '1', '--approver', 'open_1']);
  assert.equal(blocked.status, 1);
  assert.equal(blocked.stdout, '');
  assert.equal(JSON.parse(blocked.stderr).error.code, 'CONFIRMATION_REQUIRED');
  for (const action of ['approve', 'reject', 'withdraw']) {
    const missing = runCli(['experiment', 'approval', action, '-p', '1', '--exp-id', 'exp_1',
      ...(action === 'reject' ? ['--reason', 'Rejected'] : [])]);
    assert.equal(missing.status, 1);
    assert.equal(missing.stdout, '');
    assert.equal(JSON.parse(missing.stderr).error.type, 'validation');
    assert.match(JSON.parse(missing.stderr).error.message, /--approval-id/);
  }
  const invalid = runCli(['experiment', 'approval', 'approve', '-p', '1', '--exp-id', 'exp_1',
    '--approval-id', '9007199254740993', '--dry-run']);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stderr).error.type, 'validation');
});

test('approval reads preserve null, proposal, and independent runtime status', () => {
  for (const item of [null, proposal]) {
    const result = runCli(['experiment', 'approval', 'get', '-p', '1', '--exp-id', 'exp_1'],
      { ok: true, data: { item } });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data, { item });
  }
  const item = { exp_id: 'exp_1', status: 'running', approval: proposal,
    mapping_status: 'pending_review', allocation: 10 };
  const detail = runCli(['experiment', 'experiment', 'get', '-p', '1', '--exp-id', 'exp_1'],
    { ok: true, data: { item } });
  assert.equal(detail.status, 0, detail.stderr);
  assert.deepEqual(JSON.parse(detail.stdout).data, { item });
});

test('compatible draft submission retains the legacy request on older and approval-enabled backends', () => {
  const managePath = '/api/cli/engage/v1/capabilities/experiment.experiment.manage/execute';
  const detailPath = '/api/cli/engage/v1/capabilities/experiment.experiment.get/execute';
  for (const item of [
    { exp_id: 'exp_1', status: 'pending' },
    { exp_id: 'exp_1', status: 'draft', approval: proposal, mapping_status: 'pending_review' },
  ]) {
    const submission = runCli(['experiment', 'experiment', 'manage', '-p', '1',
      '--exp-id', 'exp_1', '--target-status', 'pending'], null, 200, managePath);
    assert.equal(submission.status, 0, submission.stderr);
    assert.deepEqual(JSON.parse(submission.stdout).data.input,
      { project_id: 1, exp_id: 'exp_1', target_status: 'pending' });
    const detail = runCli(['experiment', 'experiment', 'get', '-p', '1', '--exp-id', 'exp_1'],
      { ok: true, data: { item } }, 200, detailPath);
    assert.equal(detail.status, 0, detail.stderr);
    assert.deepEqual(JSON.parse(detail.stdout).data, { item });
  }
});

test('missing approval capabilities surface without retrying through the legacy write path', () => {
  for (const action of ['submit', 'get']) {
    const path = `/api/cli/engage/v1/capabilities/experiment.approval.${action}/execute`;
    const envelope = { ok: false, error: { type: 'api', code: 'CAPABILITY_NOT_FOUND',
      message: 'Capability is not registered on this server.',
      hint: 'Inspect server capabilities before selecting an experiment workflow.' },
      meta: { invocation_id: 'older-backend-test' } };
    const result = runCli(['experiment', 'approval', action, '-p', '1', '--exp-id', 'exp_1'],
      envelope, 404, path);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.deepEqual(JSON.parse(result.stderr), envelope);
  }
});

test('stale rounds, changed baselines, and permission errors remain actionable without retry', () => {
  for (const [status, type, code] of [
    [200, 'validation', 'EXPERIMENT_APPROVAL_STALE'],
    [400, 'validation', 'EXPERIMENT_APPROVAL_BASELINE_CHANGED'],
    [403, 'permission', 'ATLAS_PERMISSION_DENIED'],
  ]) {
    const envelope = { ok: false, error: { type, code,
      message: 'Experiment approval request failed.',
      hint: 'Read experiment.approval.get before another action.',
      ...(status === 403 ? {} : { details: { field: 'approval_id' } }) },
      meta: { invocation_id: 'approval-test' } };
    const result = runCli(['experiment', 'approval', 'approve', '-p', '1', '--exp-id', 'exp_1',
      '--approval-id', '42'], envelope, status);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.deepEqual(JSON.parse(result.stderr), envelope);
  }
});

test('approval input uses the same trimming as Hermes', () => {
  const request = runCli(['experiment', 'approval', 'reject', '-p', '1', '--exp-id', ' exp_1 ',
    '--approval-id', '42', '--reason', ' Reduce traffic ', '--validate']);
  assert.equal(request.status, 0, request.stderr);
  assert.deepEqual(JSON.parse(request.stdout).data.input,
    { project_id: 1, exp_id: 'exp_1', approval_id: 42, reason: 'Reduce traffic' });
  const add = runCli(['experiment', 'approver', 'add', '-p', '1', '--approvers', '[" open_1 "]', '--dry-run']);
  assert.equal(add.status, 0, add.stderr);
  assert.deepEqual(JSON.parse(add.stdout).data.input, { project_id: 1, approvers: ['open_1'] });
});
