import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdsFlag,
} from './shared.js';

export const analysisMetaAssetBatchInfoExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-info-export',
  capabilityId: 'governance.asset.batch_export_info',
  description: 'Batch export asset information.',
  flags: [projectIdFlag, nodeIdsFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids"]),
});
