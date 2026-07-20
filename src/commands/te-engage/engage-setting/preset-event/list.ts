import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Queries the project's preset metric event config (add/active/recharge event definitions). */
export const presetEventList = createEngageSettingCapabilityCommand({
  resource: 'preset-event',
  command: 'list',
  capabilityId: 'engage-setting.preset-event.list',
  description: "Query the project's preset metric event config (add/active/recharge event definitions).",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
