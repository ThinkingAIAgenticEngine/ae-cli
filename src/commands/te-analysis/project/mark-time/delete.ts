import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectMarkTimeDelete = createAnalysisCapabilityCommand({
  resource: 'project mark-time',
  command: 'delete',
  capabilityId: 'project.mark_time.delete',
  description: 'Delete project date markers.',
  flags: [
    projectIdFlag,
    { name: 'mark-time-ids', type: 'json', required: true, desc: 'Date marker IDs JSON array to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    mark_time_ids: ctx.json('mark-time-ids'),
    yes: true,
  }),
});
