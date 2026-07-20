import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectMemberHandoverRun = createAnalysisCapabilityCommand({
  resource: 'project member-handover',
  command: 'run',
  capabilityId: 'project.member_handover.run',
  description: 'Run project member asset handover.',
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
