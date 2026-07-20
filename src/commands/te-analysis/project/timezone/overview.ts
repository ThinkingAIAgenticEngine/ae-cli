import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectTimezoneOverview = createAnalysisCapabilityCommand({
  resource: 'project timezone',
  command: 'overview',
  capabilityId: 'project.timezone.overview',
  description: 'Get project time zone overview.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
  }),
});
