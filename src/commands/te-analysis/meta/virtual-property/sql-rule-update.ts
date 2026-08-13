import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalJson,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualPropertySqlRuleUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'virtual-property',
  command: 'sql-rule-update',
  capabilityId: 'metadata.virtual_property.sql_rule_update',
  description: 'Update SQL virtual property rule.',
  flags: [
    projectIdFlag,
    { name: 'sql-expression', type: 'string', required: true, desc: 'SQL expression used to calculate the virtual property.' },
    { name: 'v-prop', type: 'json', required: true, desc: 'Virtual property JSON object with prop_id beside property.' },
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
    v_prop: ctx.json('v-prop'),
    properties: optionalJson(ctx, 'properties'),
    sql_event_relation_type: optionalString(ctx, 'sql-event-relation-type'),
    related_events: optionalJson(ctx, 'related-events'),
    tag_date_policies: optionalJson(ctx, 'tag-date-policies'),
    replace_remark: optionalString(ctx, 'replace-remark'),
    replace_suggestion: optionalString(ctx, 'replace-suggestion'),
  }),
});
