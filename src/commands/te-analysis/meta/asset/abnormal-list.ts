import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetAbnormalList = createAnalysisCapabilityCommand({
  resource: 'asset',
  command: 'abnormal-list',
  capabilityId: 'metadata.asset_abnormal.list',
  description: 'List abnormal assets by resource type.',
  flags: [
    projectIdFlag,
    { name: 'resource-types', type: 'string', required: true, desc: 'Resource types to query.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), resource_types: ctx.str('resource-types') }),
});
