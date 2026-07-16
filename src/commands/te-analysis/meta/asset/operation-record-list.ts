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
  sortFieldFlag,
  sortOrderFlag,
  statusFlag,
  typeFlag,
} from './shared.js';

export const analysisMetaAssetOperationRecordList = createAnalysisGovernanceCapabilityCommand({
  resource: 'operation-record',
  command: 'list',
  capabilityId: 'governance.operation_record.list',
  description: 'List asset batch operation records.',
  flags: [projectIdFlag, typeFlag, statusFlag, queryFlag, sortFieldFlag, sortOrderFlag, directoryLimitFlag, offsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["type","status","query","sort_field","sort_order","limit","offset"]),
});
