import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_list_datasource_tables';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    datasourceId: ctx.str('datasourceId'),
    catalog: ctx.str('catalog'),
    database: ctx.str('database'),
    env: ctx.str('env'),
  };
}

export const listDatasourceTables: Command = {
  service: 'dataops_integration',
  command: '+list_datasource_tables',
  description: 'List tables under a datasource database. Required: spaceCode, datasourceId, database. Optional: catalog, env (DEV default or PROD). Returns an array of table metadata with database, tableName, tableType, tableComment, engine, disabled, disabledReasons, sameVersion, and supportSharding.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID' },
    { name: 'catalog', type: 'string', required: false, desc: 'Catalog name for catalog-based datasources such as Databricks' },
    { name: 'database', type: 'string', required: true, desc: 'Database/schema name' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (default) or PROD' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
