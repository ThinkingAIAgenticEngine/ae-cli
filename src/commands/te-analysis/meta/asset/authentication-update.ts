import {
  createAnalysisMetaCapabilityCommand,
  requiredPayloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetAuthenticationUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'asset-authentication',
  command: 'update',
  capabilityId: 'metadata.asset_authentication.update',
  description: 'Batch authenticate or unauthenticate assets.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
