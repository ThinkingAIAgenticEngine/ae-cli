import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyChangelogList = createAnalysisMetaCapabilityCommand({
  resource: 'property',
  command: 'changelog-list',
  capabilityId: 'metadata.property.changelog_list',
  description: 'List property metadata change logs.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    { name: 'prop-name', type: 'string', required: true, desc: 'Property column name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type'), prop_name: ctx.str('prop-name') }),
});
