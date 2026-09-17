import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdsFlag,
} from './shared.js';

export const analysisMetaAssetBatchSqlExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-sql-export',
  capabilityId: 'governance.asset.batch_export_sql',
  description: 'Batch export asset SQL definitions.',
  flags: [projectIdFlag, nodeIdsFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids"]),
});
