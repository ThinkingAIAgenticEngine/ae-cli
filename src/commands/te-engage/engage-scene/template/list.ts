import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Lists config templates of a config item. */
export const templateList = createEngageSceneCapabilityCommand({
  resource: 'template',
  command: 'list',
  capabilityId: 'engage-scene.template.list',
  description: 'List config templates of a config item.',
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
