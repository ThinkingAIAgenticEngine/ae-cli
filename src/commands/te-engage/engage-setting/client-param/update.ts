import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Updates an existing custom client parameter's type, select mode, and display metadata. */
export const clientParamUpdate = createEngageSettingCapabilityCommand({
  resource: 'client-param',
  command: 'update',
  capabilityId: 'engage-setting.client-param.update',
  description: "Update an existing custom client parameter's type, select mode, and display metadata.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'column-name', type: 'string', required: true, desc: 'Client param column name.' },
    { name: 'column-type', type: 'string', required: true, desc: 'Column type (see ColumnTypeEnum).' },
    { name: 'select-type', type: 'string', required: true, desc: 'Select type (see SelectTypeEnum).' },
    { name: 'column-source', type: 'string', required: false, desc: 'Param source: preset or custom.' },
    { name: 'column-desc', type: 'string', required: false, desc: 'Display name of the param. Defaults to an empty string.' },
    { name: 'column-remark', type: 'string', required: false, desc: 'Description/remark for the param.' },
    { name: 'alternative-val', type: 'json', required: false, desc: 'Optional JSON array of alternative values.' },
    { name: 'system-id-param', type: 'boolean', required: false, desc: 'Whether this is a system identifier param.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    column_name: ctx.str('column-name'),
    column_type: ctx.str('column-type'),
    select_type: ctx.str('select-type'),
    column_source: ctx.str('column-source') || undefined,
    column_desc: ctx.str('column-desc') || '',
    column_remark: ctx.str('column-remark') || undefined,
    alternative_val: ctx.json('alternative-val') || undefined,
    system_id_param: ctx.bool('system-id-param'),
  }),
});
