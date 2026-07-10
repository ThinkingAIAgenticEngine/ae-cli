import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetSearch = createAnalysisCapabilityCommand({
  resource: 'asset',
  command: 'search',
  capabilityId: 'metadata.asset.search',
  description: 'Search project assets by keyword.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
