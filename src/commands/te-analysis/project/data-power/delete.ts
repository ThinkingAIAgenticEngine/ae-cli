import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectDataPowerDelete = createAnalysisCapabilityCommand({
  resource: 'project data-power',
  command: 'delete',
  capabilityId: 'project.data_power.delete',
  description: 'Delete a data power and optionally migrate users to another data power.',
  flags: [
    projectIdFlag,
    { name: 'data-power-id', type: 'number', required: true, desc: 'Data power ID to delete.' },
    { name: 'new-data-power-id', type: 'number', required: false, desc: 'Optional replacement data power ID for affected users.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    data_power_id: ctx.num('data-power-id'),
    new_data_power_id: optionalNumber(ctx, 'new-data-power-id'),
    yes: true,
  }),
});
