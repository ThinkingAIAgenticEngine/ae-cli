import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Gets one config strategy's detail. */
export const strategyGet = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'get',
  capabilityId: 'engage-scene.strategy.get',
  description: "Get one config strategy's detail.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'strategy-uuid', type: 'string', required: true, desc: 'Strategy UUID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    strategy_uuid: ctx.str('strategy-uuid'),
  }),
});
