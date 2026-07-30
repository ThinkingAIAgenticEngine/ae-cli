import { createEngageActivityCapabilityCommand } from '../../shared.js';
import { validateActivityTopicPayload } from '../payload-validation.js';

/** Creates a topic and its tasks under an activity from a TopicAddDTO payload. */
export const topicCreate = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'create',
  capabilityId: 'engage-activity.topic.create',
  description: 'Create a topic and its tasks under an activity from a TopicAddDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc:
        'TopicAddDTO JSON body. Use triggerType 0/1 and no experiment. Topic tasks may only add an inclusion-only definitionRequest and inherit shared settings.',
    },
  ],
  risk: 'write',
  validate: (ctx) => validateActivityTopicPayload(ctx.json('payload')),
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
