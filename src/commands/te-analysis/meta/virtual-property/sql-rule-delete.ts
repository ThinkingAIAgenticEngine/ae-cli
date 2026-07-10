import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualPropertySqlRuleDelete = createAnalysisCapabilityCommand({
  resource: 'virtual-property',
  command: 'sql-rule-delete',
  capabilityId: 'metadata.virtual_property.sql_rule_delete',
  description: 'Delete or revoke SQL virtual property rule.',
  flags: [
    projectIdFlag,
    { name: 'v-prop-id', type: 'number', required: true, desc: 'Virtual property ID.' },
    { name: 'operation', type: 'string', required: false, desc: 'Delete operation. Use revoke to revoke instead of delete.' },
  ],
  risk: 'write',
  buildInput: (ctx) => (compactInput({ ...projectInput(ctx), v_prop_id: ctx.num('v-prop-id'), operation: optionalString(ctx, 'operation') })),
});
