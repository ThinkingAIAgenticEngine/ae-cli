import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  governanceExportFlags,
  governanceExportFields,
  nodeIdsFlag,
} from './shared.js';

export const analysisMetaAssetBatchInfoExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-info-export',
  capabilityId: 'governance.asset.batch_export_info',
  description: 'Batch export asset information.',
  flags: [projectIdFlag, nodeIdsFlag, payloadFlag, ...governanceExportFlags('xlsx')],
  risk: 'read',
  asyncArtifact: true,
  buildInput: (ctx) => assetGovernanceInput(ctx, [...governanceExportFields, "node_ids"]),
});
