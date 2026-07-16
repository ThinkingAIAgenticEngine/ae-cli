import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  clearHistoryTagFlag,
  nodeIdsFlag,
} from './shared.js';

export const analysisMetaAssetBatchDisableAutoBackup = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-disable-auto-backup',
  capabilityId: 'governance.asset.batch_disable_auto_backup',
  description: 'Batch disable auto backup for assets.',
  flags: [projectIdFlag, nodeIdsFlag, clearHistoryTagFlag, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids","clear_history_tag"]),
});
