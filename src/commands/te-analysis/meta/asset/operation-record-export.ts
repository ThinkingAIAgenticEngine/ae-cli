import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  governanceExportFlags,
  governanceExportFields,
  recordIdFlag,
} from './shared.js';

export const analysisMetaAssetOperationRecordExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'operation-record',
  command: 'export',
  capabilityId: 'governance.operation_record.export',
  description: 'Export one asset batch operation record result.',
  flags: [projectIdFlag, recordIdFlag, payloadFlag, ...governanceExportFlags('xlsx')],
  risk: 'read',
  asyncArtifact: true,
  buildInput: (ctx) => assetGovernanceInput(ctx, [...governanceExportFields, "record_id"]),
});
