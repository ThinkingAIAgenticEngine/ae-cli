import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Lists the global params of a config item. */
export const configParamList = createEngageSceneCapabilityCommand({
  resource: 'config-param',
  command: 'list',
  capabilityId: 'engage-scene.config-param.list',
  description: 'List the global params of a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
  }),
});
