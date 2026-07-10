import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventRelationUpdate = createAnalysisCapabilityCommand({
  resource: 'event',
  command: 'relation-update',
  capabilityId: 'metadata.event.relation_update',
  description: 'Update event-property connection or source relations.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
