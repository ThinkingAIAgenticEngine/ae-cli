import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Gets one segment associated with an engagement task. */
export const segmentListGet = createEngageTaskCapabilityCommand({
  resource: 'segment-list',
  command: 'get',
  capabilityId: 'engage-task.segment-list.get',
  description: 'Get one segment associated with an engagement task by cluster ID.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
    { name: 'cluster-id', type: 'string', required: true, desc: 'Segment cluster ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    cluster_id: ctx.str('cluster-id'),
  }),
});
