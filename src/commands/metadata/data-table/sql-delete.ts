import { createCapabilityCommand } from '../shared.js';

export const dataTableSqlDelete = createCapabilityCommand({
  resource: 'data-table',
  command: 'sql-delete',
  capabilityId: 'metadata.data_table.sql_delete',
  description: 'Delete a SQL-backed metadata data table.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'data-table-id', type: 'number', required: true, desc: 'Data table ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    data_table_id: ctx.num('data-table-id'),
  }),
});
