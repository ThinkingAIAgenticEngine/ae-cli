import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyCreate = createAnalysisCapabilityCommand({
  resource: 'property',
  command: 'create',
  capabilityId: 'metadata.property.create',
  description: 'Create event or user properties and optionally associate events.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type'), payload: ctx.json('payload') }),
});
