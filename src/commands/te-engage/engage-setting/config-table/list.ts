import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Lists all config tables (custom info) defined for a project. */
export const configTableList = createEngageSettingCapabilityCommand({
  resource: 'config-table',
  command: 'list',
  capabilityId: 'engage-setting.config-table.list',
  description: 'List all config tables (custom info) defined for a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
