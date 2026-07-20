import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Sends a test message for a config template. */
export const templateTestSend = createEngageSceneCapabilityCommand({
  resource: 'template',
  command: 'test-send',
  capabilityId: 'engage-scene.template.test-send',
  description: 'Send a test message for a config template from a ConfigTemplateSendTestDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ConfigTemplateSendTestDTO JSON body (configId, templateId, channelId, opType, mockPush, ...).',
    },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
