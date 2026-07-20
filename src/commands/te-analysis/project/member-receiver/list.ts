import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectMemberReceiverList = createAnalysisCapabilityCommand({
  resource: 'project member-receiver',
  command: 'list',
  capabilityId: 'project.member_receiver.list',
  description: 'List project member handover receivers.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
  }),
});
