import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Queries whitelist entries in a project. */
export const whitelistList = createEngageSettingCapabilityCommand({
  resource: 'whitelist',
  command: 'list',
  capabilityId: 'engage-setting.whitelist.list',
  description: 'Query whitelist entries in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
