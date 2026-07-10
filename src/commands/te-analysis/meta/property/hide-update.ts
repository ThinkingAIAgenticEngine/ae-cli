import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyHideUpdate = createAnalysisCapabilityCommand({
  resource: 'property',
  command: 'hide-update',
  capabilityId: 'metadata.property.hide_update',
  description: 'Batch hide or show properties.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    { name: 'prop-names', type: 'json', required: true, desc: 'Property names JSON array, or a JSON string accepted by common-service.' },
    { name: 'is-hide', type: 'boolean', required: true, desc: 'Whether to hide the properties.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type'), prop_names: ctx.json('prop-names'), is_hide: ctx.bool('is-hide') }),
});
