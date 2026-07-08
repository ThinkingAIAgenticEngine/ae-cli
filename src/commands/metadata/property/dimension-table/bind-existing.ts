import { createCapabilityCommand, optionalJson, optionalString } from '../../shared.js';

export const propertyDimensionTableBindExisting = createCapabilityCommand({
  resource: 'property',
  command: 'bind-existing-dimension-table',
  capabilityId: 'metadata.property.bind_existing_dimension_table',
  description: 'Bind an existing dimension data table to a metadata property.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'property-name', type: 'string', required: true, desc: 'Property technical name.' },
    { name: 'property-scope', type: 'string', required: true, desc: 'Property owner table, for example event or user.' },
    { name: 'data-table-id', type: 'number', required: true, desc: 'Existing dimension data table ID.' },
    { name: 'timestamp-join-format', type: 'string', required: false, desc: 'Optional timestamp join format.' },
    { name: 'dict-columns', type: 'json', required: false, desc: 'Optional dictionary column names JSON array.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    property_name: ctx.str('property-name'),
    property_scope: ctx.str('property-scope'),
    data_table_id: ctx.num('data-table-id'),
    timestamp_join_format: optionalString(ctx, 'timestamp-join-format'),
    dict_columns: optionalJson(ctx, 'dict-columns'),
  }),
});
