import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectFunctionList = createAnalysisCapabilityCommand({
  resource: 'project function',
  command: 'list',
  capabilityId: 'project.function.list',
  description: 'List all project-level functions.',
  flags: [
    { name: 'company-id', type: 'number', required: false, desc: 'Company ID.' },
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    company_id: optionalNumber(ctx, 'company-id'),
    project_id: ctx.num('project-id'),
  }),
});
