import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Queries all data rows of a config table by its info_id. */
export const configTableQueryData = createEngageSettingCapabilityCommand({
  resource: 'config-table',
  command: 'query-data',
  capabilityId: 'engage-setting.config-table.query-data',
  description: 'Query all data rows of a config table by its info_id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'info-id', type: 'number', required: true, desc: 'Config table ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    info_id: ctx.num('info-id'),
  }),
});
