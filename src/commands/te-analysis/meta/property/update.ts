import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'property',
  command: 'update',
  capabilityId: 'metadata.property.update',
  description: 'Update property display names and remarks.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    { name: 'prop-name', type: 'string', required: true, desc: 'Property column name.' },
    { name: 'prop-desc', type: 'string', required: false, desc: 'Property display name.' },
    { name: 'prop-remark', type: 'string', required: false, desc: 'Property remark.' },
  ],
  risk: 'write',
  buildInput: (ctx) => (compactInput({ ...projectInput(ctx), table_type: ctx.str('table-type'), prop_name: ctx.str('prop-name'), prop_desc: optionalString(ctx, 'prop-desc'), prop_remark: optionalString(ctx, 'prop-remark') })),
});
