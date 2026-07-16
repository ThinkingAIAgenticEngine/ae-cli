import {
  createAnalysisGovernanceCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  nodeIdsFlag,
  toUserIdFlag,
} from './shared.js';

export const analysisMetaAssetBatchHandover = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset',
  command: 'batch-handover',
  capabilityId: 'governance.asset.batch_handover',
  description: 'Batch hand over governed assets to another user.',
  flags: [projectIdFlag, nodeIdsFlag, toUserIdFlag, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_ids","to_user_id"]),
});
