import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  commentFlag,
  ruleFlag,
  ruleIdFlag,
  ruleNameFlag,
} from './shared.js';

export const analysisMetaAssetRuleUpdate = createAnalysisGovernanceCapabilityCommand({
  resource: 'rule',
  command: 'update',
  capabilityId: 'governance.rule.update',
  description: 'Update an asset governance rule.',
  flags: [projectIdFlag, ruleIdFlag, ruleNameFlag, commentFlag, ruleFlag, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["rule_id","rule_name","comment","rule"]),
});
