import {
  createAnalysisMetaCapabilityCommand,
  compactInput,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataExchangeRuleList = createAnalysisMetaCapabilityCommand({
  resource: 'exchange',
  command: 'rule-list',
  capabilityId: 'metadata.exchange_rule.list',
  description: 'List exchange-rate conversion rules.',
  flags: [
    projectIdFlag,
    directoryLimitFlag,
    directoryOffsetFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
