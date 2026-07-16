import {
  createAnalysisGovernanceCapabilityCommand,
  directoryLimitFlag,
  offsetFlag,
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

export const analysisMetaAssetQueryHistoryList = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-query-history',
  command: 'list',
  capabilityId: 'governance.asset_query_history.list',
  description: 'List query history for one asset.',
  flags: [projectIdFlag, nodeIdFlag, queryFlag, searchsFlag, ruleFlag, directoryLimitFlag, offsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_id","query","searchs","rule","limit","offset"]),
});
