import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectMemberUpdate = createAnalysisCapabilityCommand({
  resource: 'project member',
  command: 'update',
  capabilityId: 'project.member.update',
  description: 'Update one project member.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
    { name: 'target-user-id', type: 'number', required: true, desc: 'Target user ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
    target_user_id: ctx.num('target-user-id'),
  }),
});
