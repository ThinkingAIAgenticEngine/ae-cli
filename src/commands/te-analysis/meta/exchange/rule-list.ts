import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataExchangeRuleList = createAnalysisCapabilityCommand({
  resource: 'exchange',
  command: 'rule-list',
  capabilityId: 'metadata.exchange_rule.list',
  description: 'List exchange-rate conversion rules.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: projectInput,
});
