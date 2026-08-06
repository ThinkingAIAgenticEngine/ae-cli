import {
  createAnalysisMetaCapabilityCommand,
  compactInput,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalNumber,
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
    directoryLimitFlag,
    directoryOffsetFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
