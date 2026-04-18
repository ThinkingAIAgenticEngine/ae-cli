import { createMcpCommand, optionalJsonString, optionalString } from '../shared.js';

export const createVirtualProperty = createMcpCommand({
  command: '+create_virtual_property',
  description: 'Create a SQL-based virtual property',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'property_name', type: 'string', required: true, desc: "Property name. Must start with '#vp@' and follow the naming constraints in the schema" },
    { name: 'property_desc', type: 'string', required: false, desc: 'Display name/description' },
    { name: 'table_type', type: 'string', required: true, desc: 'Table type: event or user' },
    { name: 'select_type', type: 'string', required: true, desc: 'Select type: string, number, bool, or datetime' },
    { name: 'sql_expression', type: 'string', required: true, desc: 'SQL expression for computing the property' },
    { name: 'sql_event_relation_type', type: 'string', required: true, desc: 'SQL event relation type: relation_default, relation_always, or relation_by_setting' },
    { name: 'related_events', type: 'json', required: false, desc: "Optional related events JSON array. Required when sql_event_relation_type is relation_by_setting" },
    { name: 'property_remark', type: 'string', required: false, desc: 'Optional property remark' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    propertyName: ctx.str('property_name'),
    propertyDesc: optionalString(ctx, 'property_desc'),
    tableType: ctx.str('table_type'),
    selectType: ctx.str('select_type'),
    sqlExpression: ctx.str('sql_expression'),
    sqlEventRelationType: ctx.str('sql_event_relation_type'),
    relatedEvents: optionalJsonString(ctx, 'related_events'),
    propertyRemark: optionalString(ctx, 'property_remark'),
  }),
});
