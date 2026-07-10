import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyDelete = createAnalysisCapabilityCommand({
  resource: 'property',
  command: 'delete',
  capabilityId: 'metadata.property.delete',
  description: 'Batch delete properties or virtual properties.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    { name: 'prop-names', type: 'json', required: true, desc: 'Property names JSON array, or a JSON string accepted by common-service.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type'), prop_names: ctx.json('prop-names') }),
});
