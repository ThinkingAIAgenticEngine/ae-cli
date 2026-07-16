import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Renames a task-associated segment display name. */
export const segmentListRename = createEngageTaskCapabilityCommand({
  resource: 'segment-list',
  command: 'rename',
  capabilityId: 'engage-task.segment-list.rename',
  description: 'Rename the display name of a task-associated segment.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'cluster-id', type: 'string', required: true, desc: 'Segment cluster ID.' },
    { name: 'display-name', type: 'string', required: true, desc: 'New segment display name.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    cluster_id: ctx.str('cluster-id'),
    display_name: ctx.str('display-name'),
  }),
});
