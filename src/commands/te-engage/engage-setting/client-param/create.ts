import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Creates a custom client-side parameter; select_type is derived server-side from column_type. */
export const clientParamCreate = createEngageSettingCapabilityCommand({
  resource: 'client-param',
  command: 'create',
  capabilityId: 'engage-setting.client-param.create',
  description:
    'Create a custom client-side parameter. Pass column_type only; select_type is derived server-side. '
    + 'Allowed column_type: varchar, bigint, double, boolean.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'column-name',
      type: 'string',
      required: true,
      desc: 'Client param column name. Must match ^[A-Za-z][A-Za-z0-9_]*$, max 80.',
    },
    {
      name: 'column-type',
      type: 'string',
      required: true,
      desc: 'Column type: varchar, bigint, double, or boolean. select_type is derived server-side.',
    },
    { name: 'column-desc', type: 'string', required: false, desc: 'Display name of the param. Defaults to an empty string.' },
    { name: 'column-remark', type: 'string', required: false, desc: 'Description/remark for the param.' },
    {
      name: 'alternative-val',
      type: 'json',
      required: false,
      desc: 'Optional JSON array of alternative values. Only allowed when column_type is varchar.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    column_name: ctx.str('column-name'),
    column_type: ctx.str('column-type'),
    column_desc: ctx.str('column-desc') || '',
    column_remark: ctx.str('column-remark') || undefined,
    alternative_val: ctx.json('alternative-val') || undefined,
  }),
});
