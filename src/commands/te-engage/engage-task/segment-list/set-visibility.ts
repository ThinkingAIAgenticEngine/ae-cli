import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Sets analysis visibility for a task-associated segment. */
export const segmentListSetVisibility = createEngageTaskCapabilityCommand({
  resource: 'segment-list',
  command: 'set-visibility',
  capabilityId: 'engage-task.segment-list.set-visibility',
  description: 'Set analysis visibility for a task-associated segment.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'cluster-id', type: 'string', required: true, desc: 'Segment cluster ID.' },
    {
      name: 'analysis-visible',
      type: 'boolean',
      required: true,
      desc: 'Whether the segment is visible in analysis.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    cluster_id: ctx.str('cluster-id'),
    analysis_visible: ctx.bool('analysis-visible'),
  }),
});
