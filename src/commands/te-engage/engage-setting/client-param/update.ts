import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Updates display name, remark, and alternative values of a custom client param. column_type is immutable. */
export const clientParamUpdate = createEngageSettingCapabilityCommand({
  resource: 'client-param',
  command: 'update',
  capabilityId: 'engage-setting.client-param.update',
  description:
    'Update display name, remark, and alternative values of a custom client param. '
    + 'column_type and select_type are immutable.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'column-name', type: 'string', required: true, desc: 'Client param column name.' },
    { name: 'column-desc', type: 'string', required: false, desc: 'Display name of the param. Omit to keep the existing value.' },
    { name: 'column-remark', type: 'string', required: false, desc: 'Description/remark for the param. Omit to keep the existing value.' },
    {
      name: 'alternative-val',
      type: 'json',
      required: false,
      desc: 'Optional JSON array of alternative values. Only allowed when existing column_type is varchar. Omit to keep existing values.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    column_name: ctx.str('column-name'),
    column_desc: ctx.str('column-desc') || undefined,
    column_remark: ctx.str('column-remark') || undefined,
    alternative_val: ctx.json('alternative-val') || undefined,
  }),
});
