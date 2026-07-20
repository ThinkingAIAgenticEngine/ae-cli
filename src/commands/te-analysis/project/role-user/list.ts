import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectRoleUserList = createAnalysisCapabilityCommand({
  resource: 'project role-user',
  command: 'list',
  capabilityId: 'project.role_user.list',
  description: 'List users bound to a role.',
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
