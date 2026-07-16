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
  operationTypeFlag,
  ruleFlag,
  searchsFlag,
} from './shared.js';

export const analysisMetaAssetUsageList = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'list',
  capabilityId: 'governance.asset.list',
  description: 'List assets for usage governance.',
  flags: [projectIdFlag, queryFlag, searchsFlag, ruleFlag, operationTypeFlag, directoryLimitFlag, offsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["query","searchs","rule","operation_type","limit","offset"]),
});
