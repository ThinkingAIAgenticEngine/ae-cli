import {
  createAnalysisMetaCapabilityCommand,
  requiredPayloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventRelationUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'event',
  command: 'relation-update',
  capabilityId: 'metadata.event.relation_update',
  description: 'Update event-property connection or source relations.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
