import {
  createAnalysisMetaCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataExchangeRuleValidate = createAnalysisMetaCapabilityCommand({
  resource: 'exchange',
  command: 'rule-validate',
  capabilityId: 'metadata.exchange_rule.validate',
  description: 'Validate affected range before saving exchange-rate rules.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
