import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetAuthenticationUpdate = createAnalysisCapabilityCommand({
  resource: 'asset',
  command: 'authentication-update',
  capabilityId: 'metadata.asset_authentication.update',
  description: 'Batch authenticate or unauthenticate assets.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
