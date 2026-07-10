import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyGet = createAnalysisCapabilityCommand({
  resource: 'property',
  command: 'get',
  capabilityId: 'metadata.property.get',
  description: 'Get one event or user property metadata detail.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    { name: 'prop-name', type: 'string', required: true, desc: 'Property column name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type'), prop_name: ctx.str('prop-name') }),
});
