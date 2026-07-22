import type { RuntimeContext } from '../../../../framework/types.js';
import { createEngageSceneCapabilityCommand } from '../../shared.js';
import {
  readOptionalJsonArray,
  readOptionalString,
  readRequiredJsonArray,
  requireAllowedValue,
} from '../../utils.js';

/** Validates the payload required by a strategy management action. */
function validateAction(ctx: RuntimeContext): void {
  const action = ctx.str('action');
  requireAllowedValue(action, ['online', 'offline', 'suspend', 'delete', 'approve', 'deny', 'cancel'], 'action');
  if (['online', 'offline', 'suspend', 'delete'].includes(action)) {
    readRequiredJsonArray(ctx, 'strategy-uuid-list');
  }
  if (['approve', 'deny', 'cancel'].includes(action)) {
    readRequiredJsonArray(ctx, 'strategy-list');
  }
}

/** Applies lifecycle or review actions to config strategies. */
export const strategyManage = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'manage',
  capabilityId: 'engage-scene.strategy.manage',
  description: 'Apply lifecycle or review actions to config strategies.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'action', type: 'string', required: true, desc: 'Lifecycle or review action.' },
    { name: 'strategy-uuid-list', type: 'json', required: false, desc: 'Strategy UUID array.' },
    { name: 'strategy-list', type: 'json', required: false, desc: 'Review item array.' },
    { name: 'reason', type: 'string', required: false, desc: 'Optional review reason.' },
  ],
  risk: 'write',
  validate: validateAction,
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    action: ctx.str('action'),
    ...(readOptionalJsonArray(ctx, 'strategy-uuid-list') !== undefined
      && { strategy_uuid_list: readOptionalJsonArray(ctx, 'strategy-uuid-list') }),
    ...(readOptionalJsonArray(ctx, 'strategy-list') !== undefined
      && { strategy_list: readOptionalJsonArray(ctx, 'strategy-list') }),
    ...(readOptionalString(ctx, 'reason') !== undefined && { reason: readOptionalString(ctx, 'reason') }),
  }),
});
