import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Copies an existing topic (loads detail, renames, re-creates). */
export const topicCopy = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'copy',
  capabilityId: 'engage-activity.topic.copy',
  description: 'Copy an existing topic (loads detail, renames, re-creates).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'topic-id', type: 'string', required: true, desc: 'Source topic ID to copy.' },
    { name: 'new-name', type: 'string', required: false, desc: 'New topic name (defaults to source name + _copy).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    topic_id: ctx.str('topic-id'),
    new_name: ctx.str('new-name') || undefined,
  }),
});
