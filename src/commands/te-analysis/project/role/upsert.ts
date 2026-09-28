import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectRoleUpsert = createAnalysisCapabilityCommand({
  resource: 'project role',
  command: 'upsert',
  capabilityId: 'project.role.upsert',
  description: 'Create or update a project role.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
