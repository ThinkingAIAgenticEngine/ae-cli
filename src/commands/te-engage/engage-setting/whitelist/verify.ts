import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Checks whether given property values exist in the project whitelist, returning the matching entries. */
export const whitelistVerify = createEngageSettingCapabilityCommand({
  resource: 'whitelist',
  command: 'verify',
  capabilityId: 'engage-setting.whitelist.verify',
  description: 'Check whether given property values exist in the project whitelist, returning the matching entries.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'prop-code', type: 'string', required: true, desc: 'Associated user property code.' },
    { name: 'column-type', type: 'string', required: true, desc: 'Associated user property field type.' },
    {
      name: 'whitelist-prop-list',
      type: 'json',
      required: true,
      desc: "JSON array of whitelist property values to verify, e.g. '[\"v1\",\"v2\"]'.",
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    prop_code: ctx.str('prop-code'),
    column_type: ctx.str('column-type'),
    whitelist_prop_list: ctx.json('whitelist-prop-list'),
  }),
});
