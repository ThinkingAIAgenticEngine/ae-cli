import {
  createAnalysisMetaCapabilityCommand,
  compactInput,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetAbnormalList = createAnalysisMetaCapabilityCommand({
  resource: 'asset-abnormal',
  command: 'list',
  capabilityId: 'metadata.asset_abnormal.list',
  description: 'List abnormal assets by resource type.',
  flags: [
    projectIdFlag,
    { name: 'resource-types', type: 'string', required: true, desc: 'Resource types to query.' },
    directoryLimitFlag,
    directoryOffsetFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    resource_types: ctx.str('resource-types'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
