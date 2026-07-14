import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataDataTableColumnsGet = createAnalysisMetaCapabilityCommand({
  resource: 'datatable',
  command: 'columns-get',
  capabilityId: 'metadata.data_table.columns_get',
  description: 'Get columns for a project table reference.',
  flags: [
    projectIdFlag,
    { name: 'table-ref', type: 'string', required: true, desc: 'Project table reference.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_ref: ctx.str('table-ref') }),
});
