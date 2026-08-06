import {
  createAnalysisMetaCapabilityCommand,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataDataTableVersionList = createAnalysisMetaCapabilityCommand({
  resource: 'datatable',
  command: 'version-list',
  capabilityId: 'metadata.data_table_version.list',
  description: 'List data table historical versions.',
  flags: [
    projectIdFlag,
    { name: 'datatable-id', type: 'number', required: true, desc: 'Data table ID.' },
    directoryLimitFlag,
    directoryOffsetFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    datatable_id: ctx.num('datatable-id'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
