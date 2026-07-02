import { createMcpCommand } from '../shared.js';

export const getTableColumns = createMcpCommand({
  command: '+get_table_columns',
  description: 'Query the field list of a project table. Returns column names and types for a tableRef so the table structure can be understood before SQL analysis.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'table_ref', type: 'string', required: true, desc: 'Table reference. Supports hive.schema.table, schema.table, or table. If only table is provided, the backend resolves it against project available tables and fails on ambiguity.' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    tableRef: ctx.str('table_ref'),
  }),
});
