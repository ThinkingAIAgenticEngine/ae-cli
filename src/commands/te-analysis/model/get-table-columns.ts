import { createMcpCommand } from '../shared.js';

export const getTableColumns = createMcpCommand({
  command: '+get_table_columns',
  description: 'Query the field list of a project table. Returns column names and types for the specified catalog, schema, and table so the table structure can be understood before SQL analysis.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name. Default: hive' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name. Default: ta' },
    { name: 'table', type: 'string', required: true, desc: 'Table name' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    catalog: ctx.str('catalog'),
    schema: ctx.str('schema'),
    table: ctx.str('table'),
  }),
});
