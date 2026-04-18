import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getTableDetail: Command = {
  service: 'dataops_datatable',
  command: '+get_table_detail',
  description: 'Get details of data tables registered on dataops platform (including column definitions, DDL, data lineage). Input table name only, system automatically matches management mode and environment. Returns: columns (column name/type/comment), ddl (CREATE TABLE statement), lineage (upstream/downstream lineage). When env is not specified, TASK_ENV mode returns DEV and PRODUCT dual environment information by default. Supported management modes: TASK_ENV (space task table, default), IDE (IDE table), SYSTEM (system table), AUTHED_SPACE (authorized table, PRODUCT only). If table name has multiple matches, candidate list will be returned for further confirmation. Difference from ide_get_table_detail: This tool queries dataops platform registered information (including data lineage), requires table name; ide_get_table_detail directly queries data warehouse engine real-time metadata. Difference from integration_get_table_structure: integration queries external data source metadata, requires datasourceId',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'tableName', type: 'string', required: true, desc: 'Table name (supports fuzzy matching, full table name recommended)' },
    { name: 'manageMode', type: 'string', required: false, desc: 'Management mode: TASK_ENV (space task table, default), IDE (IDE table), SYSTEM (system table), AUTHED_SPACE (authorized table). Auto-match if not provided' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development), PRODUCT (production). If not provided, TASK_ENV returns dual environment info, other modes return corresponding default environment' },
    { name: 'tableType', type: 'number', required: false, desc: 'Table type: 0 (physical table, default), 1 (view)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'datatable_get_table_detail', {
      spaceCode: ctx.str('spaceCode'),
      tableName: ctx.str('tableName'),
      manageMode: ctx.str('manageMode'),
      env: ctx.str('env'),
      tableType: ctx.num('tableType'),
    });
    return parseMcpResult(result);
  },
};