import type { Command, RuntimeContext } from '../../framework/types.js';
import {
  assertEnum,
  createAdminCommand,
  encodeId,
  optionalString,
  requireJsonArray,
  withQuery,
} from './shared.js';
import { CliValidationError } from '../../core/errors.js';

const MEMBER_STATUSES = ['all', 'enabled', 'disabled'] as const;
const MEMBER_ROLES = ['agent_admin', 'member'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

function memberBatchBody(ctx: RuntimeContext): Record<string, unknown> {
  const members = requireJsonArray(ctx, 'members');
  if (
    members.length === 0
    || members.some(
      (member) =>
        !member
        || typeof member !== 'object'
        || Array.isArray(member)
        || typeof (member as Record<string, unknown>).openId !== 'string'
        || !(member as Record<string, string>).openId.trim(),
    )
  ) {
    throw new CliValidationError(
      '--members must contain objects with a non-empty openId',
      { hint: 'Example: --members \'[{"openId":"ou_x","loginName":"alice"}]\'' },
    );
  }

  return {
    members,
    ...(optionalString(ctx, 'rule-id') ? { ruleId: ctx.str('rule-id') } : {}),
    createSandbox: ctx.bool('create-sandbox'),
  };
}

export const listMemberCandidates = createAdminCommand({
  command: '+list-member-candidates',
  description: 'List TE company users that can be added to Agent system management',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/te-members' }),
});

export const listMembers = createAdminCommand({
  command: '+list-members',
  description: 'List Agent system members in the current company',
  flags: [
    { name: 'q', type: 'string', desc: 'Search login name or display name' },
    {
      name: 'status',
      type: 'string',
      desc: `Member status filter: ${MEMBER_STATUSES.join(' | ')}`,
    },
    { name: 'page', type: 'number', min: 1, desc: 'Page number (default: 1)' },
    { name: 'page-size', type: 'number', min: 1, max: 100, desc: 'Page size (1-100, default: 20)' },
    { name: 'all', type: 'boolean', desc: 'Return all matching members without pagination' },
    { name: 'sort-field', type: 'string', desc: 'Optional sort field: periodUsedAmount' },
    {
      name: 'sort-dir',
      type: 'string',
      desc: `Sort direction: ${SORT_DIRECTIONS.join(' | ')}`,
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    assertEnum('status', optionalString(ctx, 'status'), MEMBER_STATUSES);
    assertEnum('sort-dir', optionalString(ctx, 'sort-dir'), SORT_DIRECTIONS);
    const sortField = optionalString(ctx, 'sort-field');
    if (sortField && sortField !== 'periodUsedAmount') {
      throw new CliValidationError('--sort-field must be periodUsedAmount');
    }
  },
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/admin/members', {
      q: optionalString(ctx, 'q'),
      status: optionalString(ctx, 'status'),
      page: ctx.optionalNum('page'),
      pageSize: ctx.optionalNum('page-size'),
      all: ctx.bool('all') ? true : undefined,
      sortField: optionalString(ctx, 'sort-field'),
      sortDir: optionalString(ctx, 'sort-dir'),
    }),
  }),
});

export const addMembers = createAdminCommand({
  command: '+add-members',
  description: 'Add one or more TE users to the Agent system member list',
  flags: [
    {
      name: 'members',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'JSON array, @file, or stdin (-): openId plus optional loginName/displayName',
    },
    { name: 'rule-id', type: 'string', desc: 'Optional quota rule ID to bind to every member' },
    {
      name: 'create-sandbox',
      type: 'boolean',
      desc: 'Create and bind a personal sandbox for every added member',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: '/api/admin/members/batch-add',
    body: memberBatchBody(ctx),
  }),
});

export const setMemberStatus = createAdminCommand({
  command: '+set-member-status',
  description: 'Enable or disable an Agent system member',
  flags: [
    { name: 'open-id', type: 'string', required: true, desc: 'TE user openId' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'Whether the member can use Agent' },
    { name: 'display-name', type: 'string', desc: 'Optional display name update' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PATCH',
    path: '/api/admin/members',
    body: {
      openId: ctx.str('open-id'),
      enabled: ctx.bool('enabled'),
      ...(optionalString(ctx, 'display-name') ? { displayName: ctx.str('display-name') } : {}),
    },
  }),
});

export const setMemberRole = createAdminCommand({
  command: '+set-member-role',
  description: 'Grant or revoke the Agent administrator role for a member',
  flags: [
    { name: 'user-id', type: 'string', required: true, desc: 'Agent database user ID from +list-members' },
    {
      name: 'role',
      type: 'string',
      required: true,
      desc: `Target role: ${MEMBER_ROLES.join(' | ')}`,
    },
  ],
  risk: 'write',
  validate: (ctx) => assertEnum('role', optionalString(ctx, 'role'), MEMBER_ROLES),
  prepare: (ctx) => ({
    method: 'PATCH',
    path: `/api/admin/members/${encodeId(ctx.str('user-id'))}/role`,
    body: { agentRole: ctx.str('role') },
  }),
});

export const removeMember = createAdminCommand({
  command: '+remove-member',
  description: 'Remove a non-root member from Agent system management',
  flags: [
    { name: 'user-id', type: 'string', required: true, desc: 'Agent database user ID from +list-members' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: `/api/admin/members/${encodeId(ctx.str('user-id'))}`,
  }),
});

export const memberCommands: Command[] = [
  listMemberCandidates,
  listMembers,
  addMembers,
  setMemberStatus,
  setMemberRole,
  removeMember,
];
