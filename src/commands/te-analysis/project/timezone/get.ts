import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectTimezoneGet = createAnalysisCapabilityCommand({
  resource: 'project timezone',
  command: 'get',
  capabilityId: 'project.timezone.get',
  description: 'Get project time zone configuration.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
  }),
});
