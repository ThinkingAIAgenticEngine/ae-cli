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

export const analysisMetaAssetDependencyList = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-dependency',
  command: 'list',
  capabilityId: 'governance.asset_dependency.list',
  description: 'List upstream dependencies for one asset.',
  flags: [projectIdFlag, nodeIdFlag, queryFlag, searchsFlag, ruleFlag, directoryLimitFlag, directoryOffsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_id","query","searchs","rule","limit","offset"]),
});
