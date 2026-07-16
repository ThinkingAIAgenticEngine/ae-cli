import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetAuthenticationList = createAnalysisMetaCapabilityCommand({
  resource: 'asset-authentication',
  command: 'list',
  capabilityId: 'metadata.asset_authentication.list',
  description: 'List authenticatable project assets and authentication status.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: projectInput,
});
