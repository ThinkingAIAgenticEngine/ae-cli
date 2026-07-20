import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Creates a config template. */
export const templateCreate = createEngageSceneCapabilityCommand({
  resource: 'template',
  command: 'create',
  capabilityId: 'engage-scene.template.create',
  description: 'Create a config template from a ConfigTemplateAddDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ConfigTemplateAddDTO JSON body (configId, templateId, templateName, remark, ...).',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
