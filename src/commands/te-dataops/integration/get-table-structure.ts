import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_get_table_structure';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    datasourceId: ctx.str('datasourceId'),
    catalog: ctx.str('catalog'),
    database: ctx.str('database'),
    tablePath: ctx.str('tablePath'),
    env: ctx.str('env'),
  };
}

export const getTableStructure: Command = {
  service: 'dataops_integration',
  command: '+get_table_structure',
  description: 'Get structure for a datasource table. Required: spaceCode, datasourceId, database, tablePath. Optional: catalog, env (DEV default or PROD). Returns columns and partitionColumns.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID' },
    { name: 'catalog', type: 'string', required: false, desc: 'Catalog name for catalog-based datasources such as Databricks' },
    { name: 'database', type: 'string', required: true, desc: 'Database name' },
    { name: 'tablePath', type: 'string', required: true, desc: 'Table name or path' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (default) or PROD' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
