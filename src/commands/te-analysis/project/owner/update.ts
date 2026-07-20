import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectOwnerUpdate = createAnalysisCapabilityCommand({
  resource: 'project owner',
  command: 'update',
  capabilityId: 'project.owner.update',
  description: 'Update project owner.',
  flags: [
    projectIdFlag,
    { name: 'company-id', type: 'number', required: true, desc: 'Company ID.' },
    { name: 'owner-user-id', type: 'number', required: false, desc: 'New owner user ID. Omit to only downgrade existing owner.' },
    { name: 'project-name', type: 'string', required: false, desc: 'Optional project name update.' },
    { name: 'project-remark', type: 'string', required: false, desc: 'Optional project remark update.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    company_id: ctx.num('company-id'),
    owner_user_id: optionalNumber(ctx, 'owner-user-id'),
    project_name: optionalString(ctx, 'project-name'),
    project_remark: optionalString(ctx, 'project-remark'),
  }),
});
