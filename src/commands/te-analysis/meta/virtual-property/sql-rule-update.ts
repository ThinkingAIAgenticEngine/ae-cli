import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualPropertySqlRuleUpdate = createAnalysisCapabilityCommand({
  resource: 'virtual-property',
  command: 'sql-rule-update',
  capabilityId: 'metadata.virtual_property.sql_rule_update',
  description: 'Update SQL virtual property rule.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
