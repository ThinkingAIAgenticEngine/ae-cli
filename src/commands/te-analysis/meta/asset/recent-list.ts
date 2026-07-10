import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetRecentList = createAnalysisCapabilityCommand({
  resource: 'asset',
  command: 'recent-list',
  capabilityId: 'metadata.asset.recent_list',
  description: 'List recently visited assets for the current user.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
