import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Deletes a config table and all its data by its info_id. */
export const configTableDelete = createEngageSettingCapabilityCommand({
  resource: 'config-table',
  command: 'delete',
  capabilityId: 'engage-setting.config-table.delete',
  description: 'Delete a config table and all its data by its info_id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'info-id', type: 'number', required: true, desc: 'Config table ID to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    info_id: ctx.num('info-id'),
  }),
});
