import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectMemberRemove = createAnalysisCapabilityCommand({
  resource: 'project member',
  command: 'remove',
  capabilityId: 'project.member.remove',
  description: 'Remove a project member and optionally hand over assets.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
    { name: 'from-open-id', type: 'string', required: true, desc: 'Open ID of the member to remove.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
    from_open_id: ctx.str('from-open-id'),
    yes: true,
  }),
});
