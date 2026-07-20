import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectMemberList = createAnalysisCapabilityCommand({
  resource: 'project member',
  command: 'list',
  capabilityId: 'project.member.list',
  description: 'List project members.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
  }),
});
