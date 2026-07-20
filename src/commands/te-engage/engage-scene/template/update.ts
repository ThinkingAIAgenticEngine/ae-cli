import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Updates a config template. */
export const templateUpdate = createEngageSceneCapabilityCommand({
  resource: 'template',
  command: 'update',
  capabilityId: 'engage-scene.template.update',
  description: 'Update a config template from a ConfigTemplateModifyDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ConfigTemplateModifyDTO JSON body (configId, templateId, templateName, remark, config, ...).',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
