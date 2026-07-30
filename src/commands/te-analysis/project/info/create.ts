import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  optionalString,
} from '../../capability-shared.js';

export const projectInfoCreate = createAnalysisCapabilityCommand({
  resource: 'project info',
  command: 'create',
  capabilityId: 'project.info.create',
  description: 'Create a project without exposing unsupported avatar fields.',
  flags: [
    { name: 'company-id', type: 'number', required: true, min: 1, desc: 'Company ID.' },
    { name: 'project-name', type: 'string', required: true, minLength: 1, maxLength: 80, desc: 'Project name.' },
    { name: 'load-history', type: 'boolean', required: false, desc: 'Load historical data. Default: false.' },
    { name: 'owner-user-id', type: 'number', required: false, min: 1, desc: 'Optional owner user ID.' },
    { name: 'project-remark', type: 'string', required: false, maxLength: 200, desc: 'Optional project remark.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    company_id: ctx.num('company-id'),
    project_name: ctx.str('project-name'),
    load_history: ctx.str('load-history') === '' ? false : ctx.bool('load-history'),
    owner_user_id: optionalNumber(ctx, 'owner-user-id'),
    project_remark: optionalString(ctx, 'project-remark'),
  }),
});
