import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSystemTables: Command = {
  service: 'dataops_datatable',
  command: '+list_system_tables',
  description: 'Search system tables (event tables, user tables, dimension tables), query by project ID or project name. Returns: projectId, projectName, tableName, tableType, schemaName, catalogName, columns (column definitions), tableComment (table description). Note: At least one of projectId or projectName must be provided. Only returns tables user has permission to access',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'projectId', type: 'number', required: false, desc: 'Project ID' },
    { name: 'projectName', type: 'string', required: false, desc: 'Project name' },
    { name: 'pageNum', type: 'number', required: false, desc: 'Page number, default 1' },
    { name: 'pageSize', type: 'number', required: false, desc: 'Page size, default 20' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'datatable_list_system_tables', {
      spaceCode: ctx.str('spaceCode'),
      projectId: ctx.num('projectId'),
      projectName: ctx.str('projectName'),
      pageNum: ctx.num('pageNum'),
      pageSize: ctx.num('pageSize'),
    });
    return parseMcpResult(result);
  },
};