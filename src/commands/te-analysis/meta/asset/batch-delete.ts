import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdsFlag,
} from './shared.js';

export const analysisMetaAssetBatchDelete = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-delete',
  capabilityId: 'governance.asset.batch_delete',
  description: 'Batch delete governed assets.',
  flags: [projectIdFlag, nodeIdsFlag, payloadFlag],
  risk: 'high-risk-write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids"]),
});
