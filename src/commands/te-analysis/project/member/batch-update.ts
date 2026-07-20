import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectMemberBatchUpdate = createAnalysisCapabilityCommand({
  resource: 'project member',
  command: 'batch-update',
  capabilityId: 'project.member.batch_update',
  description: 'Batch update project members.',
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
