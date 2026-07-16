import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdFlag,
} from './shared.js';

export const analysisMetaAssetLineageGet = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-lineage',
  command: 'get',
  capabilityId: 'governance.asset_lineage.get',
  description: 'Get an asset lineage tree.',
  flags: [projectIdFlag, nodeIdFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_id"]),
});
