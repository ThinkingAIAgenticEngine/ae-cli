import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventList = createAnalysisMetaCapabilityCommand({
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
