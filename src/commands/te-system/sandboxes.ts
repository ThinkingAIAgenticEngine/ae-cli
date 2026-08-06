import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import {
  createAdminCommand,
  encodeId,
  optionalString,
  requireStringArray,
  withQuery,
} from './shared.js';

function batchCreateBody(ctx: RuntimeContext): Record<string, unknown> {
  const userIds = requireStringArray(ctx, 'user-ids');
  if (userIds.length > 100) {
    throw new CliValidationError('--user-ids supports at most 100 users per request');
  }
  return {
    userIds,
    ...(optionalString(ctx, 'description') ? { description: ctx.str('description') } : {}),
  };
}

export const listSandboxes = createAdminCommand({
  command: '+list-sandboxes',
  description: 'List sandboxes managed by the current company',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/sandboxes' }),
});

export const getSandboxConfig = createAdminCommand({
  command: '+get-sandbox-config',
  description: 'Get sandbox feature status and company create/active seat limits',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/sandbox/config' }),
});

export const batchCreateSandboxes = createAdminCommand({
  command: '+batch-create-sandboxes',
  description: 'Create personal sandboxes for up to 100 company members',
  flags: [
    {
      name: 'user-ids',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'Non-empty JSON string array, @file, or stdin (-) of Agent user IDs',
    },
    {
      name: 'description',
      type: 'string',
      maxLength: 48,
      desc: 'Optional sandbox description (max 48 characters)',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: '/api/admin/sandboxes/batch-create',
    body: batchCreateBody(ctx),
  }),
});

export const updateSandbox = createAdminCommand({
  command: '+update-sandbox',
  description: 'Update a sandbox description',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
    {
      name: 'description',
      type: 'string',
      required: true,
      maxLength: 48,
      desc: 'New sandbox description (max 48 characters)',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PUT',
    path: `/api/admin/sandboxes/${encodeId(ctx.str('id'))}`,
    body: { description: ctx.str('description') },
  }),
});

export const setSandboxEnabled = createAdminCommand({
  command: '+set-sandbox-enabled',
  description: 'Enable or disable a sandbox',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'Whether the sandbox is enabled' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PATCH',
    path: `/api/admin/sandboxes/${encodeId(ctx.str('id'))}/enabled`,
    body: { enabled: ctx.bool('enabled') },
  }),
});

export const startSandbox = createAdminCommand({
  command: '+start-sandbox',
  description: 'Start the container for an enabled sandbox',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: `/api/admin/sandboxes/${encodeId(ctx.str('id'))}/containers/start`,
  }),
});

export const stopSandbox = createAdminCommand({
  command: '+stop-sandbox',
  description: 'Stop the container for a sandbox',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: `/api/admin/sandboxes/${encodeId(ctx.str('id'))}/containers/stop`,
  }),
});

export const listSandboxUsers = createAdminCommand({
  command: '+list-sandbox-users',
  description: 'List users bound to a sandbox',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
  ],
  risk: 'read',
  prepare: (ctx) => ({
    method: 'GET',
    path: `/api/admin/sandboxes/${encodeId(ctx.str('id'))}/users`,
  }),
});

export const bindSandboxUser = createAdminCommand({
  command: '+bind-sandbox-user',
  description: 'Bind a company member to a sandbox',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
    { name: 'user-id', type: 'string', required: true, desc: 'Agent user ID from +list-members' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: `/api/admin/sandboxes/${encodeId(ctx.str('id'))}/users`,
    body: { userId: ctx.str('user-id') },
  }),
});

export const unbindSandboxUser = createAdminCommand({
  command: '+unbind-sandbox-user',
  description: 'Remove a user binding from a sandbox',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
    { name: 'user-id', type: 'string', required: true, desc: 'Agent user ID from +list-members' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: withQuery(`/api/admin/sandboxes/${encodeId(ctx.str('id'))}/users`, {
      userId: ctx.str('user-id'),
    }),
  }),
});

export const removeSandbox = createAdminCommand({
  command: '+remove-sandbox',
  description: 'Delete a sandbox and its user bindings',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Sandbox ID from +list-sandboxes' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: `/api/admin/sandboxes/${encodeId(ctx.str('id'))}`,
  }),
});

export const sandboxCommands: Command[] = [
  listSandboxes,
  getSandboxConfig,
  batchCreateSandboxes,
  updateSandbox,
  setSandboxEnabled,
  startSandbox,
  stopSandbox,
  listSandboxUsers,
  bindSandboxUser,
  unbindSandboxUser,
  removeSandbox,
];
