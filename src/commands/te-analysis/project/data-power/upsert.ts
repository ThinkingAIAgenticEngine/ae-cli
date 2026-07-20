import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectDataPowerUpsert = createAnalysisCapabilityCommand({
  resource: 'project data-power',
  command: 'upsert',
  capabilityId: 'project.data_power.upsert',
  description: 'Create or update a data power.',
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
