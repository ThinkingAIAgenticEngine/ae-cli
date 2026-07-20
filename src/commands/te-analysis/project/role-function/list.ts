import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectRoleFunctionList = createAnalysisCapabilityCommand({
  resource: 'project role-function',
  command: 'list',
  capabilityId: 'project.role_function.list',
  description: 'List functions granted to one or more roles.',
  flags: [
    { name: 'company-id', type: 'number', required: false, desc: 'Company ID.' },
    projectIdFlag,
    { name: 'role-name', type: 'string', required: false, desc: 'Single role name.' },
    { name: 'role-names', type: 'json', required: false, desc: 'Role names JSON array. When omitted, all role functions are returned.' },
    { name: 'show-system-func', type: 'boolean', required: false, desc: 'Whether to include system functions. Default false.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    company_id: optionalNumber(ctx, 'company-id'),
    project_id: ctx.num('project-id'),
    role_name: optionalString(ctx, 'role-name'),
    role_names: optionalJson(ctx, 'role-names'),
    show_system_func: optionalBoolean(ctx, 'show-system-func'),
  }),
});
