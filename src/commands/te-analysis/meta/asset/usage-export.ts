import {
  createAnalysisGovernanceCapabilityCommand,
  limitFlag,
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

export const analysisMetaAssetUsageExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'export',
  capabilityId: 'governance.asset.export',
  description: 'Export asset usage governance rows as an inline gateway result.',
  flags: [projectIdFlag, queryFlag, searchsFlag, ruleFlag, operationTypeFlag, limitFlag, offsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["query","searchs","rule","operation_type","limit","offset"]),
});
