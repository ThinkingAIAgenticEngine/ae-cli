import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Copies one template into a target config item. */
export const templateCopy = createEngageSceneCapabilityCommand({
  resource: 'template',
  command: 'copy',
  capabilityId: 'engage-scene.template.copy',
  description: 'Copy one template from a source config item to a target config item.',
  flags: [
    { name: 'source-project-id', type: 'number', required: true, desc: 'Source project ID.' },
    { name: 'source-config-id', type: 'string', required: true, desc: 'Source config item ID.' },
    { name: 'source-template-id', type: 'string', required: true, desc: 'Source template ID.' },
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Target project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Target config item ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    source_project_id: ctx.num('source-project-id'),
    source_config_id: ctx.str('source-config-id'),
    source_template_id: ctx.str('source-template-id'),
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
  }),
});
