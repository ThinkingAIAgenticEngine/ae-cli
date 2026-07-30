import { createEngageActivityCapabilityCommand } from '../../shared.js';
import { validateActivityTopicPayload } from '../payload-validation.js';

/** Updates a topic and its task relations from a TopicModifyReq payload. */
export const topicUpdate = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'update',
  capabilityId: 'engage-activity.topic.update',
  description: 'Update a topic and its task relations from a TopicModifyReq payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc:
        'TopicModifyReq JSON body. Use triggerType 0/1 and no experiment. Topic tasks may retain targetClusterType=1 from get, add an inclusion-only definitionRequest, and otherwise inherit shared settings.',
    },
  ],
  risk: 'write',
  validate: (ctx) => validateActivityTopicPayload(ctx.json('payload')),
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
