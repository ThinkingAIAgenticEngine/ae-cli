import type { Command } from '../../../framework/types.js';
import {
  defineSystemCommand,
  limitField,
  offsetField,
  queryField,
  requireArrayObjects,
  requireAtLeastOne,
  validation,
} from './shared.js';

const roleName = { flag: 'role-name', type: 'string', required: true, desc: 'Role name.' } as const;
const targetOpenId = { flag: 'target-open-id', type: 'string', required: true, desc: 'Target member open ID.' } as const;

export const systemIdentityCommands: Command[] = [
  defineSystemCommand({
    resource: 'member',
    command: 'list',
    capabilityId: 'system.member.list',
    description: 'List company members.',
    risk: 'read',
    fields: [queryField, limitField, offsetField],
  }),
  defineSystemCommand({
    resource: 'member-candidate',
    command: 'list',
    capabilityId: 'system.member_candidate.list',
    description: 'Resolve candidate company members by login name.',
    risk: 'read',
    fields: [{ flag: 'login-names', type: 'json', required: true, array: true, desc: 'Login-name JSON array.' }],
  }),
  defineSystemCommand({
    resource: 'member',
    command: 'add',
    capabilityId: 'system.member.add',
    description: 'Add company members atomically.',
    risk: 'write',
    fields: [
      { flag: 'members', type: 'json', required: true, array: true, desc: 'Member array with login_name and user_name.' },
    ],
    validate: (_ctx, input) => {
      requireAtLeastOne(input, ['members'], 'Provide a non-empty --members array.');
      requireArrayObjects(input, 'members', ['login_name', 'user_name']);
    },
  }),
  defineSystemCommand({
    resource: 'member',
    command: 'update',
    capabilityId: 'system.member.update',
    description: 'Update a company member display name.',
    risk: 'write',
    fields: [
      targetOpenId,
      { flag: 'user-name', type: 'string', required: true, desc: 'New display name.' },
    ],
  }),
  defineSystemCommand({
    resource: 'member-status',
    command: 'update',
    capabilityId: 'system.member_status.update',
    description: 'Lock or reactivate a company member.',
    risk: 'high-risk-write',
    fields: [
      targetOpenId,
      { flag: 'status', type: 'string', required: true, desc: 'Target status.', allowed: ['locked', 'active'] },
    ],
  }),
  defineSystemCommand({
    resource: 'member-project',
    command: 'batch-update',
    capabilityId: 'system.member_project.batch_update',
    description: 'Batch update and remove a member project assignments.',
    risk: 'high-risk-write',
    fields: [
      targetOpenId,
      { flag: 'project-updates', type: 'json', array: true, desc: 'Project update array: project_id, role_names, and optional data_power_id.' },
      { flag: 'project-removals', type: 'json', array: true, desc: 'Project removal and handover array.' },
    ],
    validate: (_ctx, input) => {
      requireAtLeastOne(input, ['project_updates', 'project_removals'], 'Provide a non-empty --project-updates or --project-removals array.');
      requireArrayObjects(input, 'project_updates', ['project_id', 'role_names']);
      requireArrayObjects(input, 'project_removals', ['project_id', 'handover_type']);
    },
  }),
  defineSystemCommand({
    resource: 'member',
    command: 'delete',
    capabilityId: 'system.member.delete',
    description: 'Delete a company member after all project memberships and assets are cleared.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'target-user-id', type: 'number', required: true, min: 1, desc: 'Target member user ID.' },
    ],
  }),
  defineSystemCommand({
    resource: 'admin',
    command: 'list',
    capabilityId: 'system.admin.list',
    description: 'List company system administrators.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'admin',
    command: 'upsert',
    capabilityId: 'system.admin.upsert',
    description: 'Create or update company system-administrator assignments.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'admins', type: 'json', required: true, array: true, desc: 'Administrator array with target_user_id and function_names.' },
    ],
    validate: (_ctx, input) => requireArrayObjects(input, 'admins', ['target_user_id', 'function_names']),
  }),
  defineSystemCommand({
    resource: 'admin-function',
    command: 'list',
    capabilityId: 'system.admin_function.list',
    description: 'List functions assigned to a system administrator.',
    risk: 'read',
    fields: [targetOpenId],
  }),
  defineSystemCommand({
    resource: 'admin-function',
    command: 'update',
    capabilityId: 'system.admin_function.update',
    description: 'Replace functions assigned to a system administrator.',
    risk: 'high-risk-write',
    fields: [
      targetOpenId,
      { flag: 'function-names', type: 'json', required: true, array: true, desc: 'Complete function-name JSON array.' },
    ],
    validate: (_ctx, input) =>
      requireAtLeastOne(input, ['function_names'], '--function-names must contain at least one function.'),
  }),
  defineSystemCommand({
    resource: 'admin',
    command: 'remove',
    capabilityId: 'system.admin.remove',
    description: 'Remove a company-scoped system administrator role.',
    risk: 'high-risk-write',
    fields: [targetOpenId],
  }),
  defineSystemCommand({
    resource: 'role',
    command: 'list',
    capabilityId: 'system.role.list',
    description: 'List company roles.',
    risk: 'read',
    fields: [queryField, limitField, offsetField],
  }),
  defineSystemCommand({
    resource: 'role',
    command: 'get',
    capabilityId: 'system.role.get',
    description: 'Get one company role.',
    risk: 'read',
    fields: [roleName],
  }),
  defineSystemCommand({
    resource: 'role',
    command: 'upsert',
    capabilityId: 'system.role.upsert',
    description: 'Create or update a company role and its function set.',
    risk: 'high-risk-write',
    fields: [
      { ...roleName, required: false, desc: 'Existing role name for update; omit when creating.' },
      { flag: 'role-desc', type: 'string', required: true, desc: 'Role description.' },
      { flag: 'function-names', type: 'json', required: true, array: true, desc: 'Complete function-name JSON array.' },
    ],
    validate: (_ctx, input) =>
      requireAtLeastOne(input, ['function_names'], '--function-names must contain at least one function.'),
  }),
  defineSystemCommand({
    resource: 'role',
    command: 'delete',
    capabilityId: 'system.role.delete',
    description: 'Delete a company role and optionally migrate its users.',
    risk: 'high-risk-write',
    fields: [
      roleName,
      { flag: 'new-role-name', type: 'string', desc: 'Replacement role for affected users.' },
    ],
  }),
  defineSystemCommand({
    resource: 'role-function',
    command: 'list',
    capabilityId: 'system.role_function.list',
    description: 'List functions assigned to a company role.',
    risk: 'read',
    fields: [roleName],
  }),
  defineSystemCommand({
    resource: 'role-user',
    command: 'list',
    capabilityId: 'system.role_user.list',
    description: 'List users assigned to a company role.',
    risk: 'read',
    fields: [roleName],
  }),
  defineSystemCommand({
    resource: 'function',
    command: 'list',
    capabilityId: 'system.function.list',
    description: 'List company-level system functions available for role assignment.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'seat',
    command: 'list',
    capabilityId: 'system.seat.list',
    description: 'List company seat assignments.',
    risk: 'read',
    fields: [
      queryField,
      limitField,
      offsetField,
      { flag: 'seat-type', type: 'string', desc: 'Optional seat type.', allowed: ['manage', 'view', 'empty'] },
    ],
  }),
  defineSystemCommand({
    resource: 'seat',
    command: 'update',
    capabilityId: 'system.seat.update',
    description: 'Assign or remove BI seats under serialized company quota enforcement.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'seat-type', type: 'string', required: true, desc: 'Seat type; empty removes seats.', allowed: ['manage', 'view', 'empty'] },
      { flag: 'open-ids', type: 'json', required: true, array: true, desc: 'Company member open-ID JSON array.' },
    ],
    validate: (_ctx, input) => requireAtLeastOne(input, ['open_ids'], '--open-ids must contain at least one company member.'),
  }),
];
