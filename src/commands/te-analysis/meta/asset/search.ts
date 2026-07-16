import {
  createAnalysisMetaCapabilityCommand,
  requiredPayloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetSearch = createAnalysisMetaCapabilityCommand({
  resource: 'asset',
  command: 'search',
  capabilityId: 'metadata.asset.search',
  description: 'Search project assets by keyword.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
