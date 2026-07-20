import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectMemberImport = createAnalysisCapabilityCommand({
  resource: 'project member',
  command: 'import',
  capabilityId: 'project.member.import',
  description: 'Import members and roles from another project.',
  flags: [
    projectIdFlag,
    { name: 'source-project-id', type: 'number', required: true, desc: 'Project ID to import members from.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    source_project_id: ctx.num('source-project-id'),
    yes: true,
  }),
});
