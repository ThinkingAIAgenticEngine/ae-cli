import {
  createAnalysisGovernanceCapabilityCommand,
  directoryLimitFlag,
  directoryOffsetFlag,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdFlag,
} from './shared.js';

export const analysisMetaAssetImpactList = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-impact',
  command: 'list',
  capabilityId: 'governance.asset_impact.list',
  description: 'List downstream impacts for one asset.',
  flags: [projectIdFlag, nodeIdFlag, directoryLimitFlag, directoryOffsetFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_id","limit","offset"]),
});
