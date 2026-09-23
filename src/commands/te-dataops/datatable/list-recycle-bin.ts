import type { Command, RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'datatable_list_recycle_bin';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    search: ctx.str('search'),
    maxResults: ctx.optionalNum('maxResults'),
  };
}

export const listRecycleBin: Command = {
  service: 'dataops_datatable',
  command: '+recycle_bin_list',
  description: 'List recycled TASK_ENV Hive tables and views by entity ID. Returns name, entityType, environments, recycleTime, totalCount, returnedCount, and hasMore; same-name entities remain separate.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, pattern: '\\S', desc: 'Space code' },
    { name: 'search', type: 'string', required: false, desc: 'Optional table or view name keyword' },
    { name: 'maxResults', type: 'number', required: false, min: 1, max: 1000, desc: 'Maximum number of entities to return; server default 100, maximum 1000' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const limit = ctx.optionalNum('maxResults');
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw new CliValidationError('--maxResults must be an integer between 1 and 1000.');
    }
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
