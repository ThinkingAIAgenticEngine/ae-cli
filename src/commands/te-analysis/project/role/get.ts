import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectRoleGet = createAnalysisCapabilityCommand({
  resource: 'project role',
  command: 'get',
  capabilityId: 'project.role.get',
  description: 'Get one role by role name.',
  flags: [
    projectIdFlag,
    { name: 'role-name', type: 'string', required: true, desc: 'Role name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    role_name: ctx.str('role-name'),
  }),
});
