import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectMemberAdd = createAnalysisCapabilityCommand({
  resource: 'project member',
  command: 'add',
  capabilityId: 'project.member.add',
  description: 'Add project members.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
    { name: 'type', type: 'string', required: true, desc: 'Add type accepted by ProjMemberAddTypeEnum.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
    type: ctx.str('type'),
  }),
});
