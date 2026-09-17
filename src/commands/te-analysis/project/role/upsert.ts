import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

const ROLE_UPSERT_HELP = [
  'Payload contract:',
  '- role_func_list is a non-empty array of objects. Each object requires a non-empty function_name and has_power set to integer 0 or 1.',
  '- Resolve valid function_name values with ae-cli project function list before saving the role.',
  '- role_desc is required when creating a role and must contain 1 to 80 characters. It may be omitted when updating an existing role.',
  '- Omit role_name to create a role. Pass the existing role_name to update that role.',
  '- Functions omitted from role_func_list are preserved by the service as unselected permissions with has_power=0.',
  'Example create payload:',
  '{"role_desc":"Data analyst","role_func_list":[{"function_name":"viewReport","has_power":1}]}',
  'Example update payload:',
  '{"role_name":"custom_role","role_func_list":[{"function_name":"viewReport","has_power":1}]}',
].join('\n');

export const projectRoleUpsert = createAnalysisCapabilityCommand({
  resource: 'project role',
  command: 'upsert',
  capabilityId: 'project.role.upsert',
  description: 'Create or update a project role.',
  helpText: ROLE_UPSERT_HELP,
  flags: [
    projectIdFlag,
    {
      ...requiredPayloadFlag,
      desc: 'Role payload with role_func_list object items containing function_name and has_power (0 or 1).',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
