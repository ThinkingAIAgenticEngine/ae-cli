import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import {
  approveApprovalTask,
  cancelApprovalRequest,
  getApprovalEffect,
  getApprovalRequest,
  getApprovalTask,
  getApprovalType,
  listApprovalEffects,
  listApprovalRequests,
  listApprovalTasks,
  listApprovalTypes,
  rejectApprovalTask,
  retryApprovalEffect,
  submitApprovalRequest,
} from '../src/commands/te-agent/approval-commands.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const host = 'https://te.example.com';

function context(values: Record<string, unknown> = {}): RuntimeContext {
  return {
    str: (name) => typeof values[name] === 'string' ? String(values[name]) : '',
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'agent',
    out: async () => undefined,
  };
}

const commands = [
  listApprovalTypes,
  getApprovalType,
  listApprovalRequests,
  getApprovalRequest,
  submitApprovalRequest,
  cancelApprovalRequest,
  listApprovalTasks,
  getApprovalTask,
  approveApprovalTask,
  rejectApprovalTask,
  listApprovalEffects,
  getApprovalEffect,
  retryApprovalEffect,
];

assert.deepEqual(
  commands.map((command) => `${command.service} ${command.resource} ${command.command}`),
  [
    'agent approval-type list',
    'agent approval-type get',
    'agent approval-request list',
    'agent approval-request get',
    'agent approval-request submit',
    'agent approval-request cancel',
    'agent approval-task list',
    'agent approval-task get',
    'agent approval-task approve',
    'agent approval-task reject',
    'agent approval-effect list',
    'agent approval-effect get',
    'agent approval-effect retry',
  ],
);
assert.ok(commands.every((command) => command.flags.every((flag) => flag.name !== 'id')));
assert.equal(commands.filter((command) => command.risk === 'read').length, 8);
assert.equal(commands.filter((command) => command.risk === 'write').length, 4);
assert.equal(commands.filter((command) => command.risk === 'high-risk-write').length, 1);

assert.deepEqual(listApprovalTypes.dryRun?.(context()), {
  method: 'GET',
  url: `${host}/agent/api/cli/approval/v1/types`,
});
assert.deepEqual(getApprovalType.dryRun?.(context({ approvalTypeId: 'skill.publish@1' })), {
  method: 'GET',
  url: `${host}/agent/api/cli/approval/v1/types/skill.publish%401`,
});

const requestListPreview = listApprovalRequests.dryRun?.(context({
  cursor: 'next+page',
  limit: 50,
  approvalTypeId: 'skill.publish@1',
  status: 'pending',
  requesterId: 'user-1',
  createdAfter: '2026-08-01T00:00:00Z',
  createdBefore: '2026-08-18T00:00:00Z',
})) as { url: string };
const requestListUrl = new URL(requestListPreview.url);
assert.equal(requestListUrl.pathname, '/agent/api/cli/approval/v1/requests');
assert.deepEqual(Object.fromEntries(requestListUrl.searchParams), {
  cursor: 'next+page',
  limit: '50',
  type_id: 'skill.publish@1',
  status: 'pending',
  requester_id: 'user-1',
  created_after: '2026-08-01T00:00:00Z',
  created_before: '2026-08-18T00:00:00Z',
});

assert.deepEqual(getApprovalRequest.dryRun?.(context({ approvalRequestId: 'request/1' })), {
  method: 'GET',
  url: `${host}/agent/api/cli/approval/v1/requests/request%2F1`,
});

const submitContext = context({
  approvalTypeId: 'skill.publish@1',
  resourceId: 'skill-1',
  reason: 'Publish the reviewed snapshot',
  payload: {
    description: 'Publish this Skill',
    icon_emoji: 'robot',
    nested_value: [{ child_key: true }],
  },
  clientRequestId: 'cli-submit-1',
});
submitApprovalRequest.validate?.(submitContext);
assert.deepEqual(submitApprovalRequest.dryRun?.(submitContext), {
  method: 'POST',
  url: `${host}/agent/api/cli/approval/v1/requests`,
  body: {
    type_id: 'skill.publish@1',
    resource_id: 'skill-1',
    reason: 'Publish the reviewed snapshot',
    payload: {
      description: 'Publish this Skill',
      icon_emoji: 'robot',
      nested_value: [{ child_key: true }],
    },
    client_request_id: 'cli-submit-1',
  },
});
assert.throws(
  () => submitApprovalRequest.validate?.(context({
    ...{
      approvalTypeId: 'skill.publish@1',
      resourceId: 'skill-1',
      reason: 'Publish',
      clientRequestId: 'cli-submit-2',
    },
    payload: { camelCase: true },
  })),
  /snake_case/,
);
assert.throws(
  () => submitApprovalRequest.validate?.(context({
    approvalTypeId: 'skill.publish@1',
    resourceId: 'skill-1',
    reason: 'Publish',
    clientRequestId: 'cli-submit-3',
    payload: [],
  })),
  /JSON object/,
);

const cancelContext = context({
  approvalRequestId: 'request-1',
  expectedVersion: 3,
  reason: 'No longer needed',
  clientRequestId: 'cli-cancel-1',
});
cancelApprovalRequest.validate?.(cancelContext);
assert.deepEqual(cancelApprovalRequest.dryRun?.(cancelContext), {
  method: 'POST',
  url: `${host}/agent/api/cli/approval/v1/requests/request-1/cancel`,
  body: {
    expected_version: 3,
    reason: 'No longer needed',
    client_request_id: 'cli-cancel-1',
  },
});

const taskListPreview = listApprovalTasks.dryRun?.(context({
  cursor: 'task-cursor',
  limit: 20,
  status: 'completed',
  approvalRequestId: 'request-1',
})) as { url: string };
assert.deepEqual(Object.fromEntries(new URL(taskListPreview.url).searchParams), {
  cursor: 'task-cursor',
  limit: '20',
  status: 'completed',
  request_id: 'request-1',
});
assert.deepEqual(getApprovalTask.dryRun?.(context({ taskId: 'task-1' })), {
  method: 'GET',
  url: `${host}/agent/api/cli/approval/v1/tasks/task-1`,
});

const approveContext = context({
  taskId: 'task-1',
  expectedVersion: 0,
  note: 'Reviewed',
  clientRequestId: 'cli-approve-1',
});
approveApprovalTask.validate?.(approveContext);
assert.deepEqual(approveApprovalTask.dryRun?.(approveContext), {
  method: 'POST',
  url: `${host}/agent/api/cli/approval/v1/tasks/task-1/approve`,
  body: {
    expected_version: 0,
    note: 'Reviewed',
    client_request_id: 'cli-approve-1',
  },
});

const rejectContext = context({
  taskId: 'task-1',
  expectedVersion: 2,
  reason: 'Missing evidence',
  clientRequestId: 'cli-reject-1',
});
rejectApprovalTask.validate?.(rejectContext);
assert.deepEqual(rejectApprovalTask.dryRun?.(rejectContext), {
  method: 'POST',
  url: `${host}/agent/api/cli/approval/v1/tasks/task-1/reject`,
  body: {
    expected_version: 2,
    reason: 'Missing evidence',
    client_request_id: 'cli-reject-1',
  },
});

const effectListContext = context({
  cursor: 'effect-cursor',
  limit: 10,
  status: 'manual_required',
  approvalRequestId: 'request-1',
  createdAfter: '2026-08-01T00:00:00Z',
});
listApprovalEffects.validate?.(effectListContext);
const effectListPreview = listApprovalEffects.dryRun?.(effectListContext) as { url: string };
assert.deepEqual(Object.fromEntries(new URL(effectListPreview.url).searchParams), {
  cursor: 'effect-cursor',
  limit: '10',
  status: 'manual_required',
  request_id: 'request-1',
  created_after: '2026-08-01T00:00:00Z',
});

assert.deepEqual(getApprovalEffect.dryRun?.(context({ effectId: 'effect/1' })), {
  method: 'GET',
  url: `${host}/agent/api/cli/approval/v1/effects/effect%2F1`,
});

const retryContext = context({
  effectId: 'effect-1',
  expectedVersion: 4,
  expectedAttempt: 2,
  reason: 'Retry after restoring the artifact store',
  clientRequestId: 'cli-effect-retry-1',
});
retryApprovalEffect.validate?.(retryContext);
assert.deepEqual(retryApprovalEffect.dryRun?.(retryContext), {
  method: 'POST',
  url: `${host}/agent/api/cli/approval/v1/effects/effect-1/retry`,
  body: {
    expected_version: 4,
    expected_attempt: 2,
    reason: 'Retry after restoring the artifact store',
    confirm_risk: true,
    client_request_id: 'cli-effect-retry-1',
  },
});
assert.match(retryApprovalEffect.helpText ?? '', /actual execution requires confirmation/i);
assert.match(retryApprovalEffect.helpText ?? '', /does not verify server permissions/i);
assert.throws(
  () => retryApprovalEffect.validate?.(context({
    effectId: 'effect-1',
    expectedVersion: 4,
    expectedAttempt: -1,
    reason: 'Retry',
    clientRequestId: 'cli-effect-retry-2',
  })),
  /--expected-attempt must be an integer between 0 and 2147483647/,
);
assert.throws(
  () => listApprovalEffects.validate?.(context({ status: 'completed', limit: 20 })),
  /pending, running, succeeded, failed, manual_required/,
);

assert.throws(
  () => approveApprovalTask.validate?.(context({
    taskId: 'task-1',
    expectedVersion: 1.5,
    clientRequestId: 'cli-approve-2',
  })),
  /integer between 0 and 2147483647/,
);
assert.throws(
  () => listApprovalTasks.validate?.(context({ status: 'approved', limit: 20 })),
  /pending, completed, cancelled/,
);
assert.throws(
  () => getApprovalType.validate?.(context({ approvalTypeId: 'skill.publish@2147483648' })),
  /version is out of range/,
);

for (const command of [submitApprovalRequest, cancelApprovalRequest, approveApprovalTask, rejectApprovalTask]) {
  assert.match(command.helpText ?? '', /local request preview/i);
  assert.match(command.helpText ?? '', /does not verify server permissions/i);
}

const deniedRetry = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    'src/index.ts',
    '--no-update-check',
    'agent',
    'approval-effect',
    'retry',
    '--effect-id',
    'effect-1',
    '--expected-version',
    '4',
    '--expected-attempt',
    '2',
    '--reason',
    'Retry after repair',
    '--client-request-id',
    'cli-effect-retry-gate',
  ],
  { cwd: process.cwd(), encoding: 'utf8', input: 'n\n' },
);
assert.equal(deniedRetry.status, 0, deniedRetry.stderr);
assert.match(deniedRetry.stderr, /high-risk-write operation/);
assert.match(deniedRetry.stderr, /Aborted\./);

console.log('approval command tests passed');
