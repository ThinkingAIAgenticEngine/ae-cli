import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Enables or disables a config template. */
export const templateUpdateStatus = createEngageSceneCapabilityCommand({
  resource: 'template',
  command: 'update-status',
  capabilityId: 'engage-scene.template.update-status',
  description: 'Enable or disable a config template.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'template-id', type: 'string', required: true, desc: 'Template ID.' },
    { name: 'status', type: 'number', required: true, desc: 'Status: 1 enable, 0 disable.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    template_id: ctx.str('template-id'),
    status: ctx.num('status'),
  }),
});
