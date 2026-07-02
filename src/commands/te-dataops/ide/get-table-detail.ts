import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_get_table_detail';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

function optionalBool(ctx: RuntimeContext, name: string): boolean | undefined {
  const value = ctx.json(name);
  return value === undefined ? undefined : Boolean(value);
}

function optionalEntityType(ctx: RuntimeContext): string | undefined {
  const value = optionalString(ctx, 'entityType');
  return value === undefined ? undefined : value.toUpperCase();
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    connType: optionalString(ctx, 'connType'),
    repoCode: optionalString(ctx, 'repoCode'),
    catalog: ctx.str('catalog'),
    schema: ctx.str('schema'),
    tableName: ctx.str('tableName'),
    engineType: optionalString(ctx, 'engineType'),
    entityType: optionalEntityType(ctx),
    includeDdl: optionalBool(ctx, 'includeDdl'),
  };
}

export const getTableDetail: Command = {
  service: 'dataops_ide',
  command: '+ide_get_table_detail',
  description: 'Get engine-side table/view detail. Requires spaceCode, catalog, schema, and tableName. Optional connType/repoCode/engineType default to SPACE/te_etl/TASK_ENGINE_TRINO; entityType auto-detects; includeDdl defaults false. Returns identity, storage metadata, columns, partitions, partitionKeys, optional layout fields, and tableDdl only when includeDdl=true.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: false, desc: 'Optional connection type: SPACE, ETL, or APP. Default SPACE' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Optional repository code. Default te_etl' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name' },
    { name: 'tableName', type: 'string', required: true, desc: 'Table or view name' },
    { name: 'engineType', type: 'string', required: false, desc: 'Optional engine type. Default TASK_ENGINE_TRINO' },
    { name: 'entityType', type: 'string', required: false, desc: 'Optional type hint: TABLE or VIEW. Omit to auto-detect' },
    { name: 'includeDdl', type: 'boolean', required: false, desc: 'Optional include tableDdl. Default false' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const entityType = optionalEntityType(ctx);
    if (entityType !== undefined && entityType !== 'TABLE' && entityType !== 'VIEW') {
      throw new Error('entityType must be TABLE or VIEW');
    }
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
