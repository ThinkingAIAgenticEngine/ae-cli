import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Lists all custom client parameters defined for a project. */
export const clientParamList = createEngageSettingCapabilityCommand({
  resource: 'client-param',
  command: 'list',
  capabilityId: 'engage-setting.client-param.list',
  description: 'List all custom client parameters defined for a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
