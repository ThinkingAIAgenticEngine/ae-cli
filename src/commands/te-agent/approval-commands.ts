import { CliValidationError } from '../../core/errors.js';
import type { Command, RuntimeContext } from '../../framework/types.js';
import {
  buildApprovalCliUrl,
  getApprovalCli,
  postApprovalCli,
} from './approval-cli-client.js';

const SERVICE = 'agent';
const MAX_ID_LENGTH = 191;
const MAX_VERSION = 2_147_483_647;
const DECISION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
const TASK_STATUSES = ['pending', 'completed', 'cancelled'] as const;
const EFFECT_STATUSES = ['pending', 'running', 'succeeded', 'failed', 'manual_required'] as const;
const LOCAL_DRY_RUN_HELP = [
  'Dry-run is a local request preview only.',
  'It does not verify server permissions, current approval state, or future conditional routing.',
].join(' ');

function validation(message: string, hint?: string): never {
  throw new CliValidationError(message, { hint });
}

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value ? value : undefined;
}

function validateStableId(ctx: RuntimeContext, name: string, flagName: string): void {
  const value = ctx.str(name);
  if (!value || value !== value.trim() || value.length > MAX_ID_LENGTH) {
    validation(`--${flagName} must be a non-empty identifier of at most ${MAX_ID_LENGTH} characters`);
  }
}

function validateApprovalTypeId(ctx: RuntimeContext): void {
  const value = ctx.str('approvalTypeId');
  if (!value || value.length > MAX_ID_LENGTH || !/^[a-z][a-z0-9_.-]*@[1-9]\d*$/.test(value)) {
    validation('--approval-type-id must use the format type.key@version');
  }
  const version = value.slice(value.lastIndexOf('@') + 1);
  if (BigInt(version) > BigInt(MAX_VERSION)) {
    validation('--approval-type-id version is out of range');
  }
}

function validateClientRequestId(ctx: RuntimeContext): void {
  validateStableId(ctx, 'clientRequestId', 'client-request-id');
  if (ctx.str('clientRequestId').startsWith('system:')) {
    validation('--client-request-id must not use the reserved system: prefix');
  }
}

function validateText(
  ctx: RuntimeContext,
  name: string,
  flagName: string,
  options: { required: boolean; maxLength: number },
): void {
  const value = ctx.str(name);
  if (!value && !options.required) return;
  if (!value || value.trim().length === 0) {
    validation(`--${flagName} must not be empty`);
  }
  if (value.length > options.maxLength) {
    validation(`--${flagName} must not exceed ${options.maxLength} characters`);
  }
}

function validateNonNegativeInteger(
  ctx: RuntimeContext,
  name: string,
  flagName: string,
): void {
  const value = ctx.optionalNum(name);
  if (value === undefined || !Number.isInteger(value) || value < 0 || value > MAX_VERSION) {
    validation(`--${flagName} must be an integer between 0 and ${MAX_VERSION}`);
  }
}

function validateExpectedVersion(ctx: RuntimeContext): void {
  validateNonNegativeInteger(ctx, 'expectedVersion', 'expected-version');
}

function validateExpectedAttempt(ctx: RuntimeContext): void {
  validateNonNegativeInteger(ctx, 'expectedAttempt', 'expected-attempt');
}

function assertAllowed(value: string | undefined, flagName: string, allowed: readonly string[]): void {
  if (value && !allowed.includes(value)) {
    validation(`--${flagName} must be one of: ${allowed.join(', ')}`);
  }
}

function validateDateRange(ctx: RuntimeContext): void {
  const createdAfter = optionalString(ctx, 'createdAfter');
  const createdBefore = optionalString(ctx, 'createdBefore');
  if (createdAfter && Number.isNaN(Date.parse(createdAfter))) {
    validation('--created-after must be a valid ISO datetime');
  }
  if (createdBefore && Number.isNaN(Date.parse(createdBefore))) {
    validation('--created-before must be a valid ISO datetime');
  }
  if (createdAfter && createdBefore && Date.parse(createdAfter) >= Date.parse(createdBefore)) {
    validation('--created-after must be earlier than --created-before');
  }
}

function validateLimit(ctx: RuntimeContext): void {
  const limit = ctx.optionalNum('limit') ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    validation('--limit must be an integer between 1 and 100');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateSnakeCaseValue(value: unknown, path = 'payload'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateSnakeCaseValue(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(key)) {
      validation(`--payload keys must use snake_case (invalid key at ${path})`);
    }
    validateSnakeCaseValue(child, `${path}.${key}`);
  }
}

function approvalPayload(ctx: RuntimeContext): Record<string, unknown> {
  const payload: unknown = ctx.json('payload');
  if (!isRecord(payload)) {
    validation('--payload must be a JSON object');
  }
  validateSnakeCaseValue(payload);
  return payload;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function requestListPath(ctx: RuntimeContext): string {
  return `requests${buildQuery({
    cursor: optionalString(ctx, 'cursor'),
    limit: ctx.optionalNum('limit') ?? 20,
    type_id: optionalString(ctx, 'approvalTypeId'),
    status: optionalString(ctx, 'status'),
    requester_id: optionalString(ctx, 'requesterId'),
    created_after: optionalString(ctx, 'createdAfter'),
    created_before: optionalString(ctx, 'createdBefore'),
  })}`;
}

function taskListPath(ctx: RuntimeContext): string {
  return `tasks${buildQuery({
    cursor: optionalString(ctx, 'cursor'),
    limit: ctx.optionalNum('limit') ?? 20,
    status: optionalString(ctx, 'status'),
    request_id: optionalString(ctx, 'approvalRequestId'),
    created_after: optionalString(ctx, 'createdAfter'),
    created_before: optionalString(ctx, 'createdBefore'),
  })}`;
}

function effectListPath(ctx: RuntimeContext): string {
  return `effects${buildQuery({
    cursor: optionalString(ctx, 'cursor'),
    limit: ctx.optionalNum('limit') ?? 20,
    status: optionalString(ctx, 'status'),
    request_id: optionalString(ctx, 'approvalRequestId'),
    created_after: optionalString(ctx, 'createdAfter'),
    created_before: optionalString(ctx, 'createdBefore'),
  })}`;
}

function submitBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    type_id: ctx.str('approvalTypeId'),
    resource_id: ctx.str('resourceId'),
    reason: ctx.str('reason'),
    payload: approvalPayload(ctx),
    client_request_id: ctx.str('clientRequestId'),
  };
}

function cancelBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    expected_version: ctx.num('expectedVersion'),
    ...(optionalString(ctx, 'reason') ? { reason: ctx.str('reason') } : {}),
    client_request_id: ctx.str('clientRequestId'),
  };
}

function approveBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    expected_version: ctx.num('expectedVersion'),
    ...(optionalString(ctx, 'note') ? { note: ctx.str('note') } : {}),
    client_request_id: ctx.str('clientRequestId'),
  };
}

function rejectBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    expected_version: ctx.num('expectedVersion'),
    reason: ctx.str('reason'),
    client_request_id: ctx.str('clientRequestId'),
  };
}

function retryEffectBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    expected_version: ctx.num('expectedVersion'),
    expected_attempt: ctx.num('expectedAttempt'),
    reason: ctx.str('reason'),
    confirm_risk: true,
    client_request_id: ctx.str('clientRequestId'),
  };
}

const approvalTypeIdFlag = {
  name: 'approval-type-id',
  type: 'string' as const,
  required: true,
  maxLength: MAX_ID_LENGTH,
  desc: 'Versioned approval type ID, for example skill.publish@1',
};

const approvalRequestIdFlag = {
  name: 'approval-request-id',
  type: 'string' as const,
  required: true,
  maxLength: MAX_ID_LENGTH,
  desc: 'Approval request ID',
};

const taskIdFlag = {
  name: 'task-id',
  type: 'string' as const,
  required: true,
  maxLength: MAX_ID_LENGTH,
  desc: 'Approval task ID',
};

const effectIdFlag = {
  name: 'effect-id',
  type: 'string' as const,
  required: true,
  maxLength: MAX_ID_LENGTH,
  desc: 'Approval Effect ID',
};

const clientRequestIdFlag = {
  name: 'client-request-id',
  type: 'string' as const,
  required: true,
  maxLength: MAX_ID_LENGTH,
  desc: 'Caller-generated idempotency key',
};

const expectedVersionFlag = {
  name: 'expected-version',
  type: 'number' as const,
  required: true,
  min: 0,
  max: MAX_VERSION,
  desc: 'Expected optimistic version from the latest request, task, or Effect read',
};

const expectedAttemptFlag = {
  name: 'expected-attempt',
  type: 'number' as const,
  required: true,
  min: 0,
  max: MAX_VERSION,
  desc: 'Expected Effect attempt from the latest Effect read',
};

const pageFlags = [
  { name: 'cursor', type: 'string' as const, required: false, maxLength: 1_024, desc: 'Opaque cursor from the previous page' },
  { name: 'limit', type: 'number' as const, required: false, default: 20, min: 1, max: 100, desc: 'Page size from 1 to 100' },
  { name: 'created-after', type: 'string' as const, required: false, desc: 'Include records created at or after this ISO datetime' },
  { name: 'created-before', type: 'string' as const, required: false, desc: 'Include records created before this ISO datetime' },
];

export const listApprovalTypes: Command = {
  service: SERVICE,
  resource: 'approval-type',
  command: 'list',
  description: 'List registered versioned approval types and their input contracts',
  flags: [],
  risk: 'read',
  dryRun: (ctx) => ({ method: 'GET', url: buildApprovalCliUrl(ctx, 'types') }),
  execute: (ctx) => getApprovalCli(ctx, 'types'),
};

export const getApprovalType: Command = {
  service: SERVICE,
  resource: 'approval-type',
  command: 'get',
  description: 'Get one versioned approval type and its input contract',
  flags: [approvalTypeIdFlag],
  risk: 'read',
  validate: validateApprovalTypeId,
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildApprovalCliUrl(ctx, `types/${encodeURIComponent(ctx.str('approvalTypeId'))}`),
  }),
  execute: (ctx) => getApprovalCli(ctx, `types/${encodeURIComponent(ctx.str('approvalTypeId'))}`),
};

export const listApprovalRequests: Command = {
  service: SERVICE,
  resource: 'approval-request',
  command: 'list',
  description: 'List approval requests visible to the current user',
  flags: [
    ...pageFlags,
    { name: 'approval-type-id', type: 'string', required: false, maxLength: MAX_ID_LENGTH, desc: 'Filter by versioned approval type ID' },
    { name: 'status', type: 'string', required: false, desc: `Filter by decision status: ${DECISION_STATUSES.join(' | ')}` },
    { name: 'requester-id', type: 'string', required: false, maxLength: MAX_ID_LENGTH, desc: 'Filter by requester user ID when authorized' },
  ],
  risk: 'read',
  validate: (ctx) => {
    validateLimit(ctx);
    validateDateRange(ctx);
    assertAllowed(optionalString(ctx, 'status'), 'status', DECISION_STATUSES);
    if (optionalString(ctx, 'approvalTypeId')) validateApprovalTypeId(ctx);
    if (optionalString(ctx, 'requesterId')) validateStableId(ctx, 'requesterId', 'requester-id');
  },
  dryRun: (ctx) => ({ method: 'GET', url: buildApprovalCliUrl(ctx, requestListPath(ctx)) }),
  execute: (ctx) => getApprovalCli(ctx, requestListPath(ctx)),
};

export const getApprovalRequest: Command = {
  service: SERVICE,
  resource: 'approval-request',
  command: 'get',
  description: 'Get one approval request by approval request ID',
  flags: [approvalRequestIdFlag],
  risk: 'read',
  validate: (ctx) => validateStableId(ctx, 'approvalRequestId', 'approval-request-id'),
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildApprovalCliUrl(ctx, `requests/${encodeURIComponent(ctx.str('approvalRequestId'))}`),
  }),
  execute: (ctx) => getApprovalCli(ctx, `requests/${encodeURIComponent(ctx.str('approvalRequestId'))}`),
};

export const submitApprovalRequest: Command = {
  service: SERVICE,
  resource: 'approval-request',
  command: 'submit',
  description: 'Submit a resource snapshot to a versioned approval type',
  helpText: LOCAL_DRY_RUN_HELP,
  flags: [
    approvalTypeIdFlag,
    { name: 'resource-id', type: 'string', required: true, maxLength: MAX_ID_LENGTH, desc: 'Business resource ID resolved by the selected approval type' },
    { name: 'reason', type: 'string', required: true, maxLength: 2_000, desc: 'Submission reason' },
    { name: 'payload', type: 'json', required: true, desc: 'Type-specific snake_case JSON object from approval-type get' },
    clientRequestIdFlag,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateApprovalTypeId(ctx);
    validateStableId(ctx, 'resourceId', 'resource-id');
    validateText(ctx, 'reason', 'reason', { required: true, maxLength: 2_000 });
    validateClientRequestId(ctx);
    approvalPayload(ctx);
  },
  dryRun: (ctx) => ({ method: 'POST', url: buildApprovalCliUrl(ctx, 'requests'), body: submitBody(ctx) }),
  execute: (ctx) => postApprovalCli(ctx, 'requests', submitBody(ctx)),
};

export const cancelApprovalRequest: Command = {
  service: SERVICE,
  resource: 'approval-request',
  command: 'cancel',
  description: 'Cancel a pending approval request with optimistic concurrency control',
  helpText: LOCAL_DRY_RUN_HELP,
  flags: [
    approvalRequestIdFlag,
    expectedVersionFlag,
    { name: 'reason', type: 'string', required: false, maxLength: 2_000, desc: 'Optional cancellation reason; required when cancelling another user request' },
    clientRequestIdFlag,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateStableId(ctx, 'approvalRequestId', 'approval-request-id');
    validateExpectedVersion(ctx);
    validateText(ctx, 'reason', 'reason', { required: false, maxLength: 2_000 });
    validateClientRequestId(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildApprovalCliUrl(ctx, `requests/${encodeURIComponent(ctx.str('approvalRequestId'))}/cancel`),
    body: cancelBody(ctx),
  }),
  execute: (ctx) => postApprovalCli(
    ctx,
    `requests/${encodeURIComponent(ctx.str('approvalRequestId'))}/cancel`,
    cancelBody(ctx),
  ),
};

export const listApprovalTasks: Command = {
  service: SERVICE,
  resource: 'approval-task',
  command: 'list',
  description: 'List approval tasks currently visible to the current approver',
  flags: [
    ...pageFlags,
    { name: 'status', type: 'string', required: false, desc: `Filter by task status: ${TASK_STATUSES.join(' | ')}` },
    { name: 'approval-request-id', type: 'string', required: false, maxLength: MAX_ID_LENGTH, desc: 'Filter by approval request ID' },
  ],
  risk: 'read',
  validate: (ctx) => {
    validateLimit(ctx);
    validateDateRange(ctx);
    assertAllowed(optionalString(ctx, 'status'), 'status', TASK_STATUSES);
    if (optionalString(ctx, 'approvalRequestId')) {
      validateStableId(ctx, 'approvalRequestId', 'approval-request-id');
    }
  },
  dryRun: (ctx) => ({ method: 'GET', url: buildApprovalCliUrl(ctx, taskListPath(ctx)) }),
  execute: (ctx) => getApprovalCli(ctx, taskListPath(ctx)),
};

export const getApprovalTask: Command = {
  service: SERVICE,
  resource: 'approval-task',
  command: 'get',
  description: 'Get one approval task by task ID',
  flags: [taskIdFlag],
  risk: 'read',
  validate: (ctx) => validateStableId(ctx, 'taskId', 'task-id'),
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildApprovalCliUrl(ctx, `tasks/${encodeURIComponent(ctx.str('taskId'))}`),
  }),
  execute: (ctx) => getApprovalCli(ctx, `tasks/${encodeURIComponent(ctx.str('taskId'))}`),
};

export const approveApprovalTask: Command = {
  service: SERVICE,
  resource: 'approval-task',
  command: 'approve',
  description: 'Approve a pending approval task with optimistic concurrency control',
  helpText: LOCAL_DRY_RUN_HELP,
  flags: [
    taskIdFlag,
    expectedVersionFlag,
    { name: 'note', type: 'string', required: false, maxLength: 2_000, desc: 'Optional approval note' },
    clientRequestIdFlag,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateStableId(ctx, 'taskId', 'task-id');
    validateExpectedVersion(ctx);
    validateText(ctx, 'note', 'note', { required: false, maxLength: 2_000 });
    validateClientRequestId(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildApprovalCliUrl(ctx, `tasks/${encodeURIComponent(ctx.str('taskId'))}/approve`),
    body: approveBody(ctx),
  }),
  execute: (ctx) => postApprovalCli(
    ctx,
    `tasks/${encodeURIComponent(ctx.str('taskId'))}/approve`,
    approveBody(ctx),
  ),
};

export const rejectApprovalTask: Command = {
  service: SERVICE,
  resource: 'approval-task',
  command: 'reject',
  description: 'Reject a pending approval task with a required reason',
  helpText: LOCAL_DRY_RUN_HELP,
  flags: [
    taskIdFlag,
    expectedVersionFlag,
    { name: 'reason', type: 'string', required: true, maxLength: 2_000, desc: 'Rejection reason' },
    clientRequestIdFlag,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateStableId(ctx, 'taskId', 'task-id');
    validateExpectedVersion(ctx);
    validateText(ctx, 'reason', 'reason', { required: true, maxLength: 2_000 });
    validateClientRequestId(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildApprovalCliUrl(ctx, `tasks/${encodeURIComponent(ctx.str('taskId'))}/reject`),
    body: rejectBody(ctx),
  }),
  execute: (ctx) => postApprovalCli(
    ctx,
    `tasks/${encodeURIComponent(ctx.str('taskId'))}/reject`,
    rejectBody(ctx),
  ),
};

export const listApprovalEffects: Command = {
  service: SERVICE,
  resource: 'approval-effect',
  command: 'list',
  description: 'List approval Effects visible to the current company administrator',
  flags: [
    ...pageFlags,
    { name: 'status', type: 'string', required: false, desc: `Filter by Effect status: ${EFFECT_STATUSES.join(' | ')}` },
    { name: 'approval-request-id', type: 'string', required: false, maxLength: MAX_ID_LENGTH, desc: 'Filter by approval request ID' },
  ],
  risk: 'read',
  validate: (ctx) => {
    validateLimit(ctx);
    validateDateRange(ctx);
    assertAllowed(optionalString(ctx, 'status'), 'status', EFFECT_STATUSES);
    if (optionalString(ctx, 'approvalRequestId')) {
      validateStableId(ctx, 'approvalRequestId', 'approval-request-id');
    }
  },
  dryRun: (ctx) => ({ method: 'GET', url: buildApprovalCliUrl(ctx, effectListPath(ctx)) }),
  execute: (ctx) => getApprovalCli(ctx, effectListPath(ctx)),
};

export const getApprovalEffect: Command = {
  service: SERVICE,
  resource: 'approval-effect',
  command: 'get',
  description: 'Get one approval Effect by Effect ID',
  flags: [effectIdFlag],
  risk: 'read',
  validate: (ctx) => validateStableId(ctx, 'effectId', 'effect-id'),
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildApprovalCliUrl(ctx, `effects/${encodeURIComponent(ctx.str('effectId'))}`),
  }),
  execute: (ctx) => getApprovalCli(ctx, `effects/${encodeURIComponent(ctx.str('effectId'))}`),
};

export const retryApprovalEffect: Command = {
  service: SERVICE,
  resource: 'approval-effect',
  command: 'retry',
  description: 'Manually retry a failed or manual-required approval Effect',
  helpText: `${LOCAL_DRY_RUN_HELP} Actual execution requires confirmation; pass global --yes only after explicit user authorization.`,
  flags: [
    effectIdFlag,
    expectedVersionFlag,
    expectedAttemptFlag,
    { name: 'reason', type: 'string', required: true, maxLength: 2_000, desc: 'Auditable manual retry reason' },
    clientRequestIdFlag,
  ],
  risk: 'high-risk-write',
  validate: (ctx) => {
    validateStableId(ctx, 'effectId', 'effect-id');
    validateExpectedVersion(ctx);
    validateExpectedAttempt(ctx);
    validateText(ctx, 'reason', 'reason', { required: true, maxLength: 2_000 });
    validateClientRequestId(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildApprovalCliUrl(ctx, `effects/${encodeURIComponent(ctx.str('effectId'))}/retry`),
    body: retryEffectBody(ctx),
  }),
  execute: (ctx) => postApprovalCli(
    ctx,
    `effects/${encodeURIComponent(ctx.str('effectId'))}/retry`,
    retryEffectBody(ctx),
  ),
};
