import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Queries segments associated with an engagement task. */
export const segmentListQuery = createEngageTaskCapabilityCommand({
  resource: 'segment-list',
  command: 'query',
  capabilityId: 'engage-task.segment-list.query',
  description: 'Query segments created from or associated with an engagement task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
  }),
});
