import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdsFlag,
  refreshTypeFlag,
} from './shared.js';

export const analysisMetaAssetBatchDisableAutoUpdate = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-disable-auto-update',
  capabilityId: 'governance.asset.batch_disable_auto_update',
  description: 'Batch disable auto update for assets.',
  flags: [projectIdFlag, nodeIdsFlag, refreshTypeFlag, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids","refresh_type"]),
});
