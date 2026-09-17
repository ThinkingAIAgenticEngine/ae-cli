import {
  createAnalysisGovernanceCapabilityCommand,
  directoryLimitFlag,
  directoryOffsetFlag,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdFlag,
} from './shared.js';

export const analysisMetaAssetQueryHistoryList = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-query-history',
  command: 'list',
  capabilityId: 'governance.asset_query_history.list',
  description: 'List query history for one asset.',
  flags: [projectIdFlag, nodeIdFlag, directoryLimitFlag, directoryOffsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_id","limit","offset"]),
});
