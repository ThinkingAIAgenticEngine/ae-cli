import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataDataTableVersionGet = createAnalysisMetaCapabilityCommand({
  resource: 'datatable',
  command: 'version-get',
  capabilityId: 'metadata.data_table_version.get',
  description: 'Get data table version detail.',
  flags: [
    projectIdFlag,
    { name: 'version-id', type: 'number', required: true, desc: 'Data table version ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), version_id: ctx.num('version-id') }),
});
