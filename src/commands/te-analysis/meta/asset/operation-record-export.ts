import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  recordIdFlag,
} from './shared.js';

export const analysisMetaAssetOperationRecordExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'operation-record',
  command: 'export',
  capabilityId: 'governance.operation_record.export',
  description: 'Export one asset batch operation record result.',
  flags: [projectIdFlag, recordIdFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["record_id"]),
});
