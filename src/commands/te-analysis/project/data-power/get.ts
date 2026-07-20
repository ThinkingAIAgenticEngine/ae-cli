import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectDataPowerGet = createAnalysisCapabilityCommand({
  resource: 'project data-power',
  command: 'get',
  capabilityId: 'project.data_power.get',
  description: 'Get one data power detail.',
  flags: [
    projectIdFlag,
    { name: 'data-power-id', type: 'number', required: true, desc: 'Data power ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    data_power_id: ctx.num('data-power-id'),
  }),
});
