import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_list_tables';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
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
    entityType: optionalEntityType(ctx),
    pageNum: ctx.optionalNum('pageNum'),
    pageSize: ctx.optionalNum('pageSize'),
  };
}

export const listTables: Command = {
  service: 'dataops_ide',
  command: '+ide_list_tables',
  description: 'List tables or views in one catalog/schema. Requires spaceCode, catalog, and schema. Optional connType/repoCode default to SPACE/te_etl; entityType defaults to TABLE; pageNum/pageSize default to 1/20. Returns items, page fields, hasMoreMaybe, and nextAction. No keyword filter; use +search_tables for search.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: false, desc: 'Optional connection type: SPACE, ETL, or APP. Default SPACE' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Optional repository code. Default te_etl' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name' },
    { name: 'entityType', type: 'string', required: false, desc: 'Optional entity type: TABLE or VIEW. Default TABLE' },
    { name: 'pageNum', type: 'number', required: false, desc: 'Optional page number. Default 1' },
    { name: 'pageSize', type: 'number', required: false, desc: 'Optional page size. Default 20' },
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
