import type { Command, RuntimeContext } from '../../../framework/types.js';
import { callDataopsMutationApi } from '../shared.js';

const toolName = 'datatable_delete_recycled_entity';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    entityId: ctx.str('entityId'),
    name: ctx.str('name'),
  };
}

export const deleteRecycledEntity: Command = {
  service: 'dataops_datatable',
  command: '+recycle_bin_delete',
  description: 'Permanently delete one recycled TASK_ENV Hive table or view and all its existing DEV and PRODUCT mappings. Irreversible; internal table data may be deleted. Active or mixed-state entities are rejected.',
  helpText: 'Find the exact entity with dataops_datatable +recycle_bin_list, inspect --dry-run, and pass --yes only after explicit confirmation. A missing entity ID never falls back to a same-name entity. Read the current state after FAILED or PARTIAL; never retry by choosing another ID automatically.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, pattern: '\\S', desc: 'Space code' },
    { name: 'entityId', type: 'string', required: true, pattern: '\\S', desc: 'Exact recycled entity ID from dataops_datatable +recycle_bin_list' },
    { name: 'name', type: 'string', required: true, pattern: '\\S', desc: 'Exact table or view name, checked against the recycled entity ID' },
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => callDataopsMutationApi(ctx, toolName, { ...buildArgs(ctx), preview: true }),
  execute: (ctx) => callDataopsMutationApi(ctx, toolName, buildArgs(ctx)),
};
