import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectEntityDelete = createAnalysisCapabilityCommand({
  resource: 'project entity',
  command: 'delete',
  capabilityId: 'project.entity.delete',
  description: 'Delete an analysis entity.',
  flags: [
    projectIdFlag,
    { name: 'entity-id', type: 'number', required: true, desc: 'Analysis entity ID.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    entity_id: ctx.num('entity-id'),
    yes: true,
  }),
});
