import { createCapabilityCommand, optionalBoolean } from '../shared.js';

export const dataTableGet = createCapabilityCommand({
  resource: 'data-table',
  command: 'get',
  capabilityId: 'metadata.data_table.get',
  description: 'Get one metadata data table detail. Requires metadata view permission.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'data-table-id', type: 'number', required: true, desc: 'Data table ID.' },
    { name: 'include-preview', type: 'boolean', required: false, desc: 'Whether to include preview rows.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    data_table_id: ctx.num('data-table-id'),
    include_preview: optionalBoolean(ctx, 'include-preview'),
  }),
});
