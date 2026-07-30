import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectInfoDelete = createAnalysisCapabilityCommand({
  resource: 'project info',
  command: 'delete',
  capabilityId: 'project.info.delete',
  description: 'Delete a project and flush its receiver cache.',
  flags: [projectIdFlag],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    yes: true,
  }),
});
