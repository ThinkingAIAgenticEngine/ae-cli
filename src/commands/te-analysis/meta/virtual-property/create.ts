import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalJson,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualPropertyCreate = createAnalysisMetaCapabilityCommand({
  resource: 'virtual-property',
  command: 'create',
  capabilityId: 'metadata.virtual_property.create',
  description: 'Create a SQL virtual event or user property.',
  flags: [
    projectIdFlag,
    { name: 'sql-expression', type: 'string', required: true, desc: 'SQL expression used to calculate the virtual property.' },
    { name: 'v-prop', type: 'json', required: false, desc: 'Virtual property JSON object with property.column_name/table_type/select_type fields.' },
    { name: 'property-name', type: 'string', required: false, desc: "Virtual property name. Must start with '#vp@'." },
    { name: 'property-desc', type: 'string', required: false, desc: 'Virtual property display name.' },
    { name: 'table-type', type: 'string', required: false, desc: 'Property table type: event or user.' },
    { name: 'select-type', type: 'string', required: false, desc: 'Property value type: string, number, bool, or datetime.' },
    { name: 'property-remark', type: 'string', required: false, desc: 'Optional virtual property remark.' },
    { name: 'properties', type: 'json', required: false, desc: 'Dependent property JSON array.' },
    { name: 'sql-event-relation-type', type: 'string', required: false, desc: 'relation_default, relation_always, or relation_by_setting.' },
    { name: 'related-events', type: 'json', required: false, desc: 'Related events JSON array when using relation_by_setting.' },
    { name: 'tag-date-policies', type: 'json', required: false, desc: 'Optional tag date policies JSON array.' },
    { name: 'replace-remark', type: 'string', required: false, desc: 'Replacement remark.' },
    { name: 'replace-suggestion', type: 'string', required: false, desc: 'Replacement suggestion.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    sql_expression: ctx.str('sql-expression'),
    v_prop: virtualProperty(ctx),
    properties: optionalJson(ctx, 'properties'),
    sql_event_relation_type: optionalString(ctx, 'sql-event-relation-type'),
    related_events: optionalJson(ctx, 'related-events'),
    tag_date_policies: optionalJson(ctx, 'tag-date-policies'),
    replace_remark: optionalString(ctx, 'replace-remark'),
    replace_suggestion: optionalString(ctx, 'replace-suggestion'),
  }),
});

function virtualProperty(ctx: Parameters<typeof optionalJson>[0]): unknown {
  const vProp = optionalJson(ctx, 'v-prop');
  if (vProp !== undefined) {
    return vProp;
  }
  const propertyName = optionalString(ctx, 'property-name');
  const tableType = optionalString(ctx, 'table-type');
  const selectType = optionalString(ctx, 'select-type');
  if (propertyName === undefined || tableType === undefined || selectType === undefined) {
    throw new Error('Pass --v-prop, or pass --property-name, --table-type, and --select-type');
  }
  return {
    property: compactInput({
      column_name: propertyName,
      column_desc: optionalString(ctx, 'property-desc'),
      column_remark: optionalString(ctx, 'property-remark'),
      table_type: tableType,
      select_type: selectType,
    }),
  };
}
