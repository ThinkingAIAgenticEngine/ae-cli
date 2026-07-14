import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetAbnormalGet = createAnalysisMetaCapabilityCommand({
  resource: 'asset',
  command: 'abnormal-get',
  capabilityId: 'metadata.asset_abnormal.get',
  description: 'Get abnormal reason for one asset.',
  flags: [
    projectIdFlag,
    { name: 'resource-type', type: 'string', required: true, desc: 'Resource type.' },
    { name: 'resource-id', type: 'string', required: false, desc: 'Resource ID.' },
    { name: 'resource-name', type: 'string', required: false, desc: 'Resource name.' },
    { name: 'table-type', type: 'number', required: false, desc: 'Property table type when the resource is a property.' },
  ],
  risk: 'read',
  buildInput: (ctx) => (compactInput({ ...projectInput(ctx), resource_type: ctx.str('resource-type'), resource_id: optionalString(ctx, 'resource-id'), resource_name: optionalString(ctx, 'resource-name'), table_type: optionalNumber(ctx, 'table-type') })),
});
