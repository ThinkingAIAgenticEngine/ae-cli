import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Queries a config strategy's log. */
export const strategyLog = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'log',
  capabilityId: 'engage-scene.strategy.log',
  description: 'Query a config strategy\'s log.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'strategy-uuid', type: 'string', required: true, desc: 'Strategy UUID whose log to query.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    strategy_uuid: ctx.str('strategy-uuid'),
  }),
});
