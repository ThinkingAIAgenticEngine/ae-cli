import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventList = createAnalysisCapabilityCommand({
  resource: 'event',
  command: 'list',
  capabilityId: 'metadata.event.list',
  description: 'List project super events.',
  flags: [
    projectIdFlag,
  ],
  risk: 'read',
  buildInput: projectInput,
});
