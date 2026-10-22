import type { Flag, RuntimeContext } from '../../../../framework/types.js';
import { CliValidationError } from '../../../../core/errors.js';
import { projectIdFlag } from '../../capability-shared.js';

const MAX_ID = 2147483647;

export const memberGroupProjectIdFlag: Flag = { ...projectIdFlag, min: 1, max: MAX_ID };
export const memberGroupIdFlag: Flag = {
  name: 'group-id', type: 'number', required: true, min: 1, max: MAX_ID,
  desc: 'Project member-group ID from project member-group list.',
};
export const memberGroupNameFlag: Flag = {
  name: 'group-name', type: 'string', required: true,
  desc: 'Member-group name, from 1 to 80 characters.',
};
export const memberGroupUserIdsFlag: Flag = {
  name: 'user-ids', type: 'json', required: true,
  desc: 'JSON array of 1 to 1000 positive user IDs. Verify IDs with project member list or member-group members. Changes only these group memberships.',
};
export const memberGroupPaginationFlags: Flag[] = [
  { name: 'limit', type: 'number', min: 1, max: 1000, desc: 'Page size, from 1 to 1000. Default: 100.' },
  { name: 'offset', type: 'number', min: 0, desc: 'Zero-based row offset. Default: 0.' },
];

function integer(ctx: RuntimeContext, flag: string, min: number, max = MAX_ID): number {
  const value = ctx.num(flag);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new CliValidationError(`--${flag} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

export function memberGroupProjectInput(ctx: RuntimeContext): Record<string, unknown> {
  return { project_id: integer(ctx, 'project-id', 1) };
}

export function memberGroupInput(ctx: RuntimeContext): Record<string, unknown> {
  return { ...memberGroupProjectInput(ctx), group_id: integer(ctx, 'group-id', 1) };
}

export function memberGroupPaginationInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    ...(ctx.str('limit') ? { limit: integer(ctx, 'limit', 1, 1000) } : {}),
    ...(ctx.str('offset') ? { offset: integer(ctx, 'offset', 0) } : {}),
  };
}

export function memberGroupNameInput(ctx: RuntimeContext): Record<string, unknown> {
  const name = ctx.str('group-name');
  if (!name.trim() || name.length > 80) {
    throw new CliValidationError('--group-name must contain 1 to 80 characters and must not be blank.');
  }
  return { group_name: name };
}

export function memberGroupChangeInput(ctx: RuntimeContext): Record<string, unknown> {
  const input = memberGroupInput(ctx);
  let userIds: unknown;
  try { userIds = ctx.json('user-ids'); } catch {
    throw new CliValidationError('--user-ids must be a JSON array of positive user IDs.');
  }
  if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 1000
    || userIds.some(id => !Number.isSafeInteger(id) || id < 1 || id > MAX_ID)) {
    throw new CliValidationError('--user-ids must contain 1 to 1000 positive integer user IDs.');
  }
  return { ...input, user_ids: userIds, yes: true };
}
