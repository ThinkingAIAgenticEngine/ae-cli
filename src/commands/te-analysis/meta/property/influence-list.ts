import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyInfluenceList = createAnalysisMetaCapabilityCommand({
  resource: 'property',
  command: 'influence-list',
  capabilityId: 'metadata.property.influence_list',
  description: 'List assets affected by property changes.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    { name: 'prop-name', type: 'string', required: true, desc: 'Property column name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type'), prop_name: ctx.str('prop-name') }),
});
