import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectUserIdItemsUpdate = createAnalysisCapabilityCommand({
  resource: 'project user-id-items',
  command: 'update',
  capabilityId: 'project.user_id_items.update',
  description: 'Update project virtual user ID item configuration.',
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
