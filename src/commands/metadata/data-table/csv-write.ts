import { createCapabilityCommand, optionalDataTableColumns, optionalNumber, optionalString } from '../shared.js';

export const dataTableCsvWrite = createCapabilityCommand({
  resource: 'data-table',
  command: 'csv-write',
  capabilityId: 'metadata.data_table.csv_write',
  description: 'Create or update a CSV-backed metadata data table from an uploaded input file.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'operation', type: 'string', required: true, desc: 'Write operation: create, incremental_update, or replace_update.' },
    { name: 'input-file-id', type: 'string', required: true, desc: 'Uploaded input file ID, for example ifile_<32 lowercase hex>.' },
    { name: 'data-table-id', type: 'number', required: false, desc: 'Existing data table ID for update operations.' },
    { name: 'data-table-name', type: 'string', required: false, desc: 'Optional technical data table name. If supplied, use datatable_<project_id>_<name>.' },
    { name: 'display-name', type: 'string', required: false, desc: 'Human-readable data table name.' },
    { name: 'description', type: 'string', required: false, desc: 'Data table description.' },
    { name: 'columns', type: 'json', required: false, desc: 'Column definitions JSON array. Use column_name/select_type/column_desc, or name/type/display_name aliases.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    operation: ctx.str('operation'),
    data_table_id: optionalNumber(ctx, 'data-table-id'),
    input_file_id: ctx.str('input-file-id'),
    data_table_name: optionalString(ctx, 'data-table-name'),
    display_name: optionalString(ctx, 'display-name'),
    description: optionalString(ctx, 'description'),
    columns: optionalDataTableColumns(ctx, 'columns', 'csv'),
  }),
});
