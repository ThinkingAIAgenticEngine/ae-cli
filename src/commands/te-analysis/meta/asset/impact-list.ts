import {
  createAnalysisGovernanceCapabilityCommand,
  directoryLimitFlag,
  directoryOffsetFlag,
  payloadFlag,
  projectIdFlag,
  queryFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdFlag,
  ruleFlag,
  searchsFlag,
} from './shared.js';

export const analysisMetaAssetImpactList = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-impact',
  command: 'list',
  capabilityId: 'governance.asset_impact.list',
  description: 'List downstream impacts for one asset.',
  flags: [projectIdFlag, nodeIdFlag, queryFlag, searchsFlag, ruleFlag, directoryLimitFlag, directoryOffsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_id","query","searchs","rule","limit","offset"]),
});
