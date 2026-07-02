import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_get_schema_info';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    connType: optionalString(ctx, 'connType'),
    repoCode: optionalString(ctx, 'repoCode'),
    catalog: ctx.str('catalog'),
    schema: ctx.str('schema'),
  };
}

function schemaStats(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }
  const value = data as Record<string, unknown>;
  return {
    schema: value.schema,
    tableNum: value.tableNum,
    viewNum: value.viewNum,
  };
}

export const getSchemaInfo: Command = {
  service: 'dataops_ide',
  command: '+get_schema_info',
  description: 'Get schema-level statistics for one catalog/schema. Requires spaceCode, catalog, and schema. Optional connType/repoCode default to SPACE/te_etl. Returns only schema, tableNum, and viewNum.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: false, desc: 'Connection type. Defaults to SPACE. Use SPACE for daily query development, ETL for data processing, APP for external services.' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Repository code. Defaults to te_etl. Use +ide_list_repos to discover other repositories.' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return schemaStats(await callDataopsApi(ctx, toolName, buildArgs(ctx)));
  },
};
