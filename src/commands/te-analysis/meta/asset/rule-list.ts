import {
  createAnalysisGovernanceCapabilityCommand,
  directoryLimitFlag,
  directoryOffsetFlag,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
} from './shared.js';

export const analysisMetaAssetRuleList = createAnalysisGovernanceCapabilityCommand({
  resource: 'rule',
  command: 'list',
  capabilityId: 'governance.rule.list',
  description: 'List asset governance rules.',
  flags: [projectIdFlag, payloadFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ['limit', 'offset']),
});
