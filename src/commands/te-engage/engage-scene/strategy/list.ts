import { createEngageSceneCapabilityCommand } from '../../shared.js';
import { readOptionalJsonArray, readOptionalString } from '../../utils.js';

/** Lists strategies under a project or config item. */
export const strategyList = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'list',
  capabilityId: 'engage-scene.strategy.list',
  description: 'List strategies under a project or config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: false, desc: 'Optional config item ID.' },
    { name: 'strategy-uuid-list', type: 'json', required: false, desc: 'Optional strategy UUID array.' },
  ],
  risk: 'read',
  validate: (ctx) => { readOptionalJsonArray(ctx, 'strategy-uuid-list'); },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    ...(readOptionalString(ctx, 'config-id') !== undefined && { config_id: readOptionalString(ctx, 'config-id') }),
    ...(readOptionalJsonArray(ctx, 'strategy-uuid-list') !== undefined
      && { strategy_uuid_list: readOptionalJsonArray(ctx, 'strategy-uuid-list') }),
  }),
});
