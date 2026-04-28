import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getTagDefinitionSchema = createMcpCommand({
  command: '+get_tag_definition_schema',
  description: 'Get the tag definition schema by type and optional response mode',
  flags: [
    { name: 'type', type: 'string', required: true, desc: 'Tag type: condition/metric/first_last/sql' },
    { name: 'response_mode', type: 'string', required: false, desc: 'Optional response mode: base/examples/full' },
    { name: 'condition_subtype', type: 'string', required: false, desc: 'Optional subtype when type=condition: core/behavior_seq/all' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      type: ctx.str('type'),
      responseMode: optionalString(ctx, 'response_mode'),
      conditionSubtype: optionalString(ctx, 'condition_subtype'),
    }),
});
