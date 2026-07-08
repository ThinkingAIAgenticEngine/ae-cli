import { createCapabilityCommand, optionalJson } from '../shared.js';

export const dataTablePropertyBindingsUpdate = createCapabilityCommand({
  resource: 'data-table',
  command: 'property-bindings-update',
  capabilityId: 'metadata.data_table.property_bindings_update',
  description: 'Update property bindings for an existing metadata data table.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'data-table-id', type: 'number', required: true, desc: 'Data table ID.' },
    { name: 'bind-properties', type: 'json', required: false, desc: 'Properties to bind JSON array. Each item includes property_name and property_scope.' },
    { name: 'unbind-properties', type: 'json', required: false, desc: 'Properties to unbind JSON array. Each item includes property_name and property_scope.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    data_table_id: ctx.num('data-table-id'),
    bind_properties: optionalJson(ctx, 'bind-properties'),
    unbind_properties: optionalJson(ctx, 'unbind-properties'),
  }),
});
