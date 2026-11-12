import { randomUUID } from 'node:crypto';
import { requestA2a, resolveA2aTarget } from '../../core/a2a-client.js';
import { CliValidationError } from '../../core/errors.js';
import type { Command, RuntimeContext } from '../../framework/types.js';

export const evaluationExtension = 'https://thinkingdata.cn/a2a/extensions/agent-evaluation/v1';
const lifecycleExtension = 'https://thinkingdata.cn/a2a/extensions/context-lifecycle/v1';

const urlFlag = { name: 'url', type: 'string' as const, required: true, desc: 'AE A2A Agent Card or JSON-RPC URL on the selected authorized host' };

function identifier(ctx: RuntimeContext, name: string): string {
  const value = ctx.str(name);
  if (!value || value !== value.trim() || value.length > 191) {
    throw new CliValidationError(`--${name} must be a non-empty identifier of at most 191 characters`);
  }
  return value;
}

function validateTarget(ctx: RuntimeContext): void {
  resolveA2aTarget(ctx.host(), ctx.str('url'));
}

function rpc(method: string, params: unknown): Record<string, unknown> {
  return { jsonrpc: '2.0', id: randomUUID(), method, params };
}

function historyParams(ctx: RuntimeContext): Record<string, unknown> {
  const historyLength = ctx.optionalNum('history-length');
  if (historyLength !== undefined && (!Number.isInteger(historyLength) || historyLength < 0)) {
    throw new CliValidationError('--history-length must be a non-negative integer');
  }
  return historyLength === undefined ? {} : { historyLength };
}

const historyFlag = { name: 'history-length', type: 'number' as const, desc: 'Maximum returned history messages; zero omits history (server caps at 100)' };

function selection(ctx: RuntimeContext): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [flag, field] of [['space-id', 'agentSpaceId'], ['model', 'model']]) {
    if (ctx.has?.(flag) || ctx.str(flag)) result[field] = identifier(ctx, flag);
  }
  if (result.agentSpaceId && !/^[A-Za-z0-9_-]{1,191}$/.test(result.agentSpaceId)) {
    throw new CliValidationError('--space-id must contain only letters, digits, underscores, or hyphens');
  }
  if (result.model && ctx.str('task-id')) throw new CliValidationError('--model cannot be used when replying with --task-id');
  return result;
}

function sendBody(ctx: RuntimeContext): Record<string, unknown> {
  const selected = selection(ctx);
  return rpc('SendMessage', {
    message: {
      messageId: ctx.str('message-id') || randomUUID(), role: 'ROLE_USER',
      parts: [{ text: ctx.str('message') }],
      ...(Object.keys(selected).length ? { metadata: { [evaluationExtension]: selected }, extensions: [evaluationExtension] } : {}),
      ...(ctx.str('context-id') ? { contextId: ctx.str('context-id') } : {}),
      ...(ctx.str('task-id') ? { taskId: ctx.str('task-id') } : {}),
    },
    configuration: { returnImmediately: true, ...historyParams(ctx) },
  });
}

export const a2aCard: Command = {
  service: 'agent', resource: 'a2a', command: '+card',
  description: 'Read an AE A2A Agent Card using the current CLI authorization',
  flags: [urlFlag], risk: 'read', validate: validateTarget,
  dryRun: (ctx) => ({ method: 'GET', url: resolveA2aTarget(ctx.host(), ctx.str('url')).card }),
  execute: (ctx) => requestA2a(ctx.host(), ctx.str('url')),
};

export const a2aSend: Command = {
  service: 'agent', resource: 'a2a', command: '+send',
  description: 'Submit a task to an AE A2A Agent using the current CLI authorization',
  helpText: 'Returns immediately. Poll the returned task.id with agent a2a +get. Reuse --message-id when retrying a submission whose outcome is unknown.',
  flags: [urlFlag,
    { name: 'message', type: 'string', required: true, desc: 'Task text for the remote AE Agent' },
    { name: 'message-id', type: 'string', desc: 'Stable message identifier for safe submission retries; generated when omitted' },
    { name: 'context-id', type: 'string', desc: 'Existing A2A context identifier for conversation continuation' },
    { name: 'task-id', type: 'string', desc: 'Existing task identifier when responding to input-required tasks' },
    { name: 'space-id', type: 'string', desc: 'Authorized Agent workspace ID from the Agent Card spaceSelection.spaces list' },
    { name: 'model', type: 'string', desc: 'Authorized model ID from the Agent Card modelSelection.models list; cannot override a fixed Agent model' },
    historyFlag,
  ], risk: 'write',
  validate: (ctx) => {
    validateTarget(ctx);
    selection(ctx);
    historyParams(ctx);
    if (!ctx.str('message').trim()) throw new CliValidationError('--message must not be blank');
    for (const name of ['message-id', 'context-id', 'task-id']) if (ctx.has?.(name) || ctx.str(name)) identifier(ctx, name);
  },
  dryRun: (ctx) => ({ method: 'POST', url: resolveA2aTarget(ctx.host(), ctx.str('url')).rpc, body: sendBody(ctx), ...(Object.keys(selection(ctx)).length ? { headers: { 'A2A-Extensions': evaluationExtension } } : {}) }),
  execute: (ctx) => requestA2a(ctx.host(), ctx.str('url'), sendBody(ctx), Object.keys(selection(ctx)).length ? [evaluationExtension] : []),
};

export const a2aGet: Command = {
  service: 'agent', resource: 'a2a', command: '+get',
  description: 'Get AE A2A task status, history, and artifacts using the current CLI authorization',
  flags: [urlFlag, historyFlag, { name: 'id', type: 'string', required: true, desc: 'Task ID returned by A2A SendMessage' }],
  risk: 'read',
  validate: (ctx) => { validateTarget(ctx); identifier(ctx, 'id'); historyParams(ctx); },
  dryRun: (ctx) => ({ method: 'POST', url: resolveA2aTarget(ctx.host(), ctx.str('url')).rpc, body: rpc('GetTask', { id: ctx.str('id'), ...historyParams(ctx) }) }),
  execute: (ctx) => requestA2a(ctx.host(), ctx.str('url'), rpc('GetTask', { id: ctx.str('id'), ...historyParams(ctx) })),
};

export const a2aList: Command = {
  service: 'agent', resource: 'a2a', command: 'list',
  description: 'List accessible A2A tasks with optional context, status, and pagination filters',
  flags: [urlFlag, historyFlag,
    { name: 'context-id', type: 'string', desc: 'Filter tasks by conversation context ID' },
    { name: 'status', type: 'string', desc: 'Exact A2A TASK_STATE_* status value' },
    { name: 'page-size', type: 'number', desc: 'Tasks per page, from 1 to 100' },
    { name: 'page-token', type: 'string', desc: 'Opaque nextPageToken from the previous matching query' },
    { name: 'status-timestamp-after', type: 'string', desc: 'Filter by status timestamp after an ISO 8601 datetime with timezone' },
    { name: 'include-artifacts', type: 'boolean', desc: 'Include task artifacts in list results' },
  ], risk: 'read',
  validate: (ctx) => { validateTarget(ctx); listParams(ctx); },
  dryRun: (ctx) => ({ method: 'POST', url: resolveA2aTarget(ctx.host(), ctx.str('url')).rpc, body: rpc('ListTasks', listParams(ctx)) }),
  execute: (ctx) => requestA2a(ctx.host(), ctx.str('url'), rpc('ListTasks', listParams(ctx))),
};

function listParams(ctx: RuntimeContext): Record<string, unknown> {
  const params = historyParams(ctx);
  if (ctx.has?.('context-id') || ctx.str('context-id')) params.contextId = identifier(ctx, 'context-id');
  const status = ctx.str('status');
  if (ctx.has?.('status') || status) {
    if (!/^TASK_STATE_(UNSPECIFIED|SUBMITTED|WORKING|INPUT_REQUIRED|COMPLETED|CANCELED|FAILED|REJECTED|AUTH_REQUIRED)$/.test(status)) {
      throw new CliValidationError('--status must be a valid A2A TASK_STATE_* value');
    }
    params.status = status;
  }
  const pageSize = ctx.optionalNum('page-size');
  if (pageSize !== undefined) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new CliValidationError('--page-size must be an integer from 1 to 100');
    params.pageSize = pageSize;
  }
  const pageToken = ctx.str('page-token');
  if (ctx.has?.('page-token') || pageToken) {
    if (!pageToken || pageToken.length > 4096) throw new CliValidationError('--page-token must contain 1 to 4096 characters');
    params.pageToken = pageToken;
  }
  const timestamp = ctx.str('status-timestamp-after');
  if (ctx.has?.('status-timestamp-after') || timestamp) {
    if (!/T.*(Z|[+-]\d{2}:\d{2})$/.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) throw new CliValidationError('--status-timestamp-after must be an ISO 8601 datetime with timezone');
    params.statusTimestampAfter = timestamp;
  }
  const artifacts = ctx.optionalBool('include-artifacts');
  if (artifacts !== undefined) params.includeArtifacts = artifacts;
  return params;
}

export const a2aCancel: Command = {
  service: 'agent', resource: 'a2a', command: 'cancel',
  description: 'Cancel an A2A task',
  flags: [urlFlag, { name: 'id', type: 'string', required: true, desc: 'A2A task ID to cancel' }],
  risk: 'high-risk-write',
  validate: (ctx) => { validateTarget(ctx); identifier(ctx, 'id'); },
  dryRun: (ctx) => ({ method: 'POST', url: resolveA2aTarget(ctx.host(), ctx.str('url')).rpc, body: rpc('CancelTask', { id: ctx.str('id') }) }),
  execute: (ctx) => requestA2a(ctx.host(), ctx.str('url'), rpc('CancelTask', { id: ctx.str('id') })),
};

export const a2aDeleteContext: Command = {
  service: 'agent', resource: 'a2a', command: 'delete-context',
  description: 'Delete an owned A2A conversation context using the context lifecycle extension',
  flags: [urlFlag, { name: 'context-id', type: 'string', required: true, desc: 'A2A conversation context ID to delete' }],
  risk: 'high-risk-write',
  validate: (ctx) => { validateTarget(ctx); identifier(ctx, 'context-id'); },
  dryRun: (ctx) => ({ method: 'POST', url: resolveA2aTarget(ctx.host(), ctx.str('url')).rpc,
    headers: { 'A2A-Extensions': lifecycleExtension }, body: rpc('DeleteContext', { contextId: ctx.str('context-id') }) }),
  execute: (ctx) => requestA2a(ctx.host(), ctx.str('url'), rpc('DeleteContext', { contextId: ctx.str('context-id') }), [lifecycleExtension]),
};
