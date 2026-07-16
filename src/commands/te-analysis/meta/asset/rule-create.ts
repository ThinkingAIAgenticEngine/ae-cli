import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  commentFlag,
  ruleFlag,
  ruleNameFlag,
} from './shared.js';

export const analysisMetaAssetRuleCreate = createAnalysisGovernanceCapabilityCommand({
  resource: 'rule',
  command: 'create',
  capabilityId: 'governance.rule.create',
  description: 'Create an asset governance rule.',
  flags: [projectIdFlag, ruleNameFlag, commentFlag, ruleFlag, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["rule_name","comment","rule"]),
});
