import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataSuperMetadataImport = createAnalysisCapabilityCommand({
  resource: 'super-metadata',
  command: 'import',
  capabilityId: 'metadata.super_metadata.import',
  description: 'Pre-import and confirm-import super event and super property configuration.',
  flags: [
    projectIdFlag,
    { name: 'payload', type: 'json', required: false, desc: 'Optional capability payload JSON.' },
  ],
  risk: 'write',
  buildInput: (ctx) => (compactInput({ ...projectInput(ctx), payload: optionalJson(ctx, 'payload') })),
});
