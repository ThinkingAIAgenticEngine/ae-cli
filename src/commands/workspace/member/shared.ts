import type { RuntimeContext } from '../../../framework/types.js';
import { assertOneOf } from '../shared.js';

const MEMBER_ROLES = ['ADMIN', 'MEMBER'] as const;

export function memberBody(ctx: RuntimeContext) {
  const role = ctx.str('role');
  assertOneOf('role', role, MEMBER_ROLES);
  return { userId: ctx.str('userId'), role, operationSource: 'ae_cli' };
}
