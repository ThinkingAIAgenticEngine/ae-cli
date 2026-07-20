import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Gets a config template's detail. */
export const templateGet = createEngageSceneCapabilityCommand({
  resource: 'template',
  command: 'get',
  capabilityId: 'engage-scene.template.get',
  description: "Get a config template's detail.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'template-id', type: 'string', required: true, desc: 'Template ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    template_id: ctx.str('template-id'),
  }),
});
