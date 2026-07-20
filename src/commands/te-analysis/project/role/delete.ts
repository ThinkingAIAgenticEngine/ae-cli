import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectRoleDelete = createAnalysisCapabilityCommand({
  resource: 'project role',
  command: 'delete',
  capabilityId: 'project.role.delete',
  description: 'Delete a role and optionally migrate users to another role.',
  flags: [
    projectIdFlag,
    { name: 'role-name', type: 'string', required: true, desc: 'Role name to delete.' },
    { name: 'new-role-name', type: 'string', required: false, desc: 'Role name to migrate users to before deletion.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    role_name: ctx.str('role-name'),
    new_role_name: optionalString(ctx, 'new-role-name'),
    yes: true,
  }),
});
