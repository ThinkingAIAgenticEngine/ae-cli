import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyList = createAnalysisCapabilityCommand({
  resource: 'property',
  command: 'list',
  capabilityId: 'metadata.property.list',
  description: 'List event or user properties.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type') }),
});
