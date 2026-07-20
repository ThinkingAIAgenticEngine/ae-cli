import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalNumber,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectRoleList = createAnalysisCapabilityCommand({
  resource: 'project role',
  command: 'list',
  capabilityId: 'project.role.list',
  description: 'List project-visible roles.',
  flags: [
    { name: 'company-id', type: 'number', required: false, desc: 'Company ID. Required when project_id is absent.' },
    projectIdFlag,
    { name: 'visible-only', type: 'boolean', required: false, desc: 'When true, list roles visible to the current user.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    company_id: optionalNumber(ctx, 'company-id'),
    project_id: ctx.num('project-id'),
    visible_only: optionalBoolean(ctx, 'visible-only'),
  }),
});
