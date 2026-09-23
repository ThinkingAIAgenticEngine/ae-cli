import type { Command, RuntimeContext } from '../../../framework/types.js';
import { callDataopsMutationApi } from '../shared.js';

const toolName = 'datatable_recycle_entity';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    entityId: ctx.str('entityId'),
    name: ctx.str('name'),
  };
}

export const recycleEntity: Command = {
  service: 'dataops_datatable',
  command: '+entity_recycle',
  description: 'Move one TASK_ENV Hive table or view to the recycle bin, including all existing DEV and PRODUCT mappings. Requires the exact entity ID and name; never selects another entity by name.',
  helpText: 'Inspect the entity, run --dry-run for a server semantic preview, and pass --yes only after explicit confirmation. RECYCLE_NAME_CONFLICT requires inspecting and explicitly deleting the old recycled entity first; this command never deletes it automatically.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, pattern: '\\S', desc: 'Space code' },
    { name: 'entityId', type: 'string', required: true, pattern: '\\S', desc: 'Exact active DataOps entity ID from catalog discovery' },
    { name: 'name', type: 'string', required: true, pattern: '\\S', desc: 'Exact table or view name, checked against the entity ID' },
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => callDataopsMutationApi(ctx, toolName, { ...buildArgs(ctx), preview: true }),
  execute: (ctx) => callDataopsMutationApi(ctx, toolName, buildArgs(ctx)),
};
