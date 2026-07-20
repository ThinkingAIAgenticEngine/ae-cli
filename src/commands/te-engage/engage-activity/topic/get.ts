import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Gets a topic detail. */
export const topicGet = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'get',
  capabilityId: 'engage-activity.topic.get',
  description: 'Get a topic detail (cluster, channel, trigger, frequency, tasks).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'topic-id', type: 'string', required: true, desc: 'Topic ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    topic_id: ctx.str('topic-id'),
  }),
});
