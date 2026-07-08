import { createCapabilityCommand, optionalJson, optionalString } from '../../shared.js';

export const propertyDimensionTableCreateAndBindCsv = createCapabilityCommand({
  resource: 'property',
  command: 'create-and-bind-csv-dimension-table',
  capabilityId: 'metadata.property.create_and_bind_csv_dimension_table',
  description: 'Create a CSV-backed dimension data table and bind it to a metadata property.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'property-name', type: 'string', required: true, desc: 'Property technical name.' },
    { name: 'property-scope', type: 'string', required: true, desc: 'Property owner table, for example event or user.' },
    { name: 'input-file-id', type: 'string', required: true, desc: 'Uploaded input file ID, for example ifile_<32 lowercase hex>.' },
    { name: 'data-table-name', type: 'string', required: false, desc: 'Technical data table name.' },
    { name: 'display-name', type: 'string', required: false, desc: 'Human-readable data table name.' },
    { name: 'description', type: 'string', required: false, desc: 'Data table description.' },
    { name: 'columns', type: 'json', required: false, desc: 'Column definitions JSON array.' },
    { name: 'timestamp-join-format', type: 'string', required: false, desc: 'Optional timestamp join format.' },
    { name: 'dict-columns', type: 'json', required: false, desc: 'Optional dictionary column names JSON array.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    property_name: ctx.str('property-name'),
    property_scope: ctx.str('property-scope'),
    input_file_id: ctx.str('input-file-id'),
    data_table_name: optionalString(ctx, 'data-table-name'),
    display_name: optionalString(ctx, 'display-name'),
    description: optionalString(ctx, 'description'),
    columns: optionalJson(ctx, 'columns'),
    timestamp_join_format: optionalString(ctx, 'timestamp-join-format'),
    dict_columns: optionalJson(ctx, 'dict-columns'),
  }),
});
