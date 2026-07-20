import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Deletes a topic. */
export const topicDelete = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'delete',
  capabilityId: 'engage-activity.topic.delete',
  description: 'Delete a topic.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'topic-id', type: 'string', required: true, desc: 'Topic ID to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    topic_id: ctx.str('topic-id'),
  }),
});
