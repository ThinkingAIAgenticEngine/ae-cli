import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Gets a config item's detail. */
export const configItemGet = createEngageSceneCapabilityCommand({
  resource: 'config-item',
  command: 'get',
  capabilityId: 'engage-scene.config-item.get',
  description: "Get a config item's detail.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), config_id: ctx.str('config-id') }),
});
