import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectInfoGet = createAnalysisCapabilityCommand({
  resource: 'project info',
  command: 'get',
  capabilityId: 'project.info.get',
  description: 'Get project configuration details.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
  }),
});
