import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'datatable_dict_search_tables';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    search: ctx.str('search'),
    maxResults: ctx.optionalNum('maxResults'),
  };
}

export const dictSearchTables: Command = {
  service: 'dataops_datatable',
  command: '+dict_search_tables',
  description: 'Search the DataOps table catalog visible to a space, including task, IDE, system, and authorized-space tables. Use a precise keyword; empty or broad searches can be large. Matches table name, catalog, schema, comment, and remark where available. Returns tables plus totalCount, returnedCount, hasMore, and hint when truncated. Table summaries include identity, location, type, management mode, owner/subject, optional comment/remark, status, env, and createTime. Unlike ide_search_tables, this returns DataOps-enriched catalog results, not raw engine metadata.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'search', type: 'string', required: false, desc: 'Keyword matching table name/catalog/schema/comment/remark where available' },
    { name: 'maxResults', type: 'number', required: false, desc: 'Max return count, default 50, max 200' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
