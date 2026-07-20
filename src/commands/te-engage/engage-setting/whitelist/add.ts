import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Batch adds whitelist entries (entity_id + source_value) for a project user property used for test/gray sending. */
export const whitelistAdd = createEngageSettingCapabilityCommand({
  resource: 'whitelist',
  command: 'add',
  capabilityId: 'engage-setting.whitelist.add',
  description: 'Batch add whitelist entries (entity_id + source_value) for a project user property used for test/gray sending.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'prop-code', type: 'string', required: true, desc: 'Associated user property code.' },
    { name: 'column-name', type: 'string', required: true, desc: 'Associated user property field name.' },
    { name: 'column-type', type: 'string', required: true, desc: 'Associated user property field type.' },
    {
      name: 'whitelist-list',
      type: 'json',
      required: true,
      desc: "JSON array of entries, e.g. '[{\"entity_id\":\"u1\",\"source_value\":\"v1\",\"note_name\":\"n\"}]'.",
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    prop_code: ctx.str('prop-code'),
    column_name: ctx.str('column-name'),
    column_type: ctx.str('column-type'),
    whitelist_list: ctx.json('whitelist-list'),
  }),
});
