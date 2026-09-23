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
  governanceExportFlags,
  governanceExportFields,
  operationTypeFlag,
  nodeIdFlag,
  ruleFlag,
  searchsFlag,
} from './shared.js';

export const analysisMetaAssetUsageExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'export',
  capabilityId: 'governance.asset.export',
  description: 'Export asset usage governance rows as an asynchronous artifact; optionally wait and download.',
  flags: [projectIdFlag, nodeIdFlag, queryFlag, searchsFlag, ruleFlag, operationTypeFlag, limitFlag, offsetFlag, payloadFlag, ...governanceExportFlags('jsonl')],
  risk: 'read',
  asyncArtifact: true,
  buildInput: (ctx) => assetGovernanceInput(ctx, [...governanceExportFields, "node_id","query","searchs","rule","operation_type","limit","offset"]),
});
