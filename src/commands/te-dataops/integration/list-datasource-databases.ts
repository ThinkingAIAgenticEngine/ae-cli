import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_list_datasource_databases';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    datasourceId: ctx.str('datasourceId'),
    catalog: ctx.str('catalog'),
    env: ctx.str('env'),
  };
}

export const listDatasourceDatabases: Command = {
  service: 'dataops_integration',
  command: '+list_datasource_databases',
  description: 'List databases/schemas under a datasource. Required: spaceCode, datasourceId. Optional: catalog, env (DEV default or PROD). Returns an array of objects with databaseName.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID' },
    { name: 'catalog', type: 'string', required: false, desc: 'Catalog name for catalog-based datasources such as Databricks' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (default) or PROD' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
