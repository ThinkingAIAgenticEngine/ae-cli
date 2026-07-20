import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectPermissionBindingList = createAnalysisCapabilityCommand({
  resource: 'project permission-binding',
  command: 'list',
  capabilityId: 'project.permission_binding.list',
  description: 'List project role and data-power bindings for company-level permission management.',
  flags: [
    projectIdFlag,
    { name: 'company-id', type: 'number', required: true, desc: 'Company ID.' },
    { name: 'project-ids', type: 'json', required: true, desc: 'Project IDs JSON array.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    company_id: ctx.num('company-id'),
    project_ids: ctx.json('project-ids'),
  }),
});
