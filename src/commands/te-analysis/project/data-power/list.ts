import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectDataPowerList = createAnalysisCapabilityCommand({
  resource: 'project data-power',
  command: 'list',
  capabilityId: 'project.data_power.list',
  description: 'List project data powers.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
  }),
});
