import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_search_tables';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    connType: optionalString(ctx, 'connType'),
    repoCode: optionalString(ctx, 'repoCode'),
    searchKey: ctx.str('searchKey'),
    size: ctx.optionalNum('size'),
  };
}

export const searchTables: Command = {
  service: 'dataops_ide',
  command: '+search_tables',
  description: 'Search engine-side warehouse tables/views by keyword. Requires spaceCode and searchKey. Optional connType/repoCode/size default to SPACE/te_etl/20. Returns items, searchKey, size, total/table/view/returned counts, hasMore, and nextAction. Unlike +dict_search_tables, this returns raw engine metadata without DataOps lifecycle/status/owner enrichment.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: false, desc: 'Optional connection type: SPACE, ETL, or APP. Default SPACE' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Optional repository code. Default te_etl' },
    { name: 'searchKey', type: 'string', required: true, desc: 'Precise table or view keyword to search in engine-side metadata' },
    { name: 'size', type: 'number', required: false, desc: 'Optional maximum results. Default 20' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
