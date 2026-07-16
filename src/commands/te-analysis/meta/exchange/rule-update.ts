import {
  createAnalysisMetaCapabilityCommand,
  requiredPayloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataExchangeRuleUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'exchange',
  command: 'rule-update',
  capabilityId: 'metadata.exchange_rule.update',
  description: 'Save currency field, amount field, and target currency rules.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
