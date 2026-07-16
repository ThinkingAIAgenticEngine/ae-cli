import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
} from './shared.js';

export const analysisMetaAssetRuleSchema = createAnalysisGovernanceCapabilityCommand({
  resource: 'rule',
  command: 'schema',
  capabilityId: 'governance.rule.schema',
  description: 'Get asset governance rule field schema.',
  flags: [projectIdFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, []),
});
