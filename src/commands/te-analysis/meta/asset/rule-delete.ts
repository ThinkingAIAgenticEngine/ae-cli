import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  ruleIdFlag,
} from './shared.js';

export const analysisMetaAssetRuleDelete = createAnalysisGovernanceCapabilityCommand({
  resource: 'rule',
  command: 'delete',
  capabilityId: 'governance.rule.delete',
  description: 'Delete an asset governance rule.',
  flags: [projectIdFlag, ruleIdFlag, payloadFlag],
  risk: 'high-risk-write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["rule_id"]),
});
