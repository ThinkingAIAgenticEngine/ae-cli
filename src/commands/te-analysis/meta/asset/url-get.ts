import {
  createAnalysisMetaCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../../capability-shared.js';
import {
  assetGovernanceInput,
  linkInfoFlag,
  nodeIdFlag,
  resourceIdFlag,
  resourceTypeFlag,
} from './shared.js';
import { normalizeResourceUrlFields } from '../../../../core/resource-url.js';

export const analysisMetaAssetUrlGet = createAnalysisMetaCapabilityCommand({
  resource: 'asset',
  command: 'url-get',
  capabilityId: 'analysis_meta.asset_url.get',
  description: 'Get or normalize an asset governance resource link payload.',
  flags: [projectIdFlag, nodeIdFlag, resourceIdFlag, resourceTypeFlag, linkInfoFlag, payloadFlag],
  risk: 'read',
  buildInput: (ctx) => assetGovernanceInput(ctx, ["node_id","resource_id","resource_type","link_info"]),
  postProcess: (result, _input, ctx) => {
    normalizeResourceUrlFields(result, ctx.host());
    return result;
  },
});
