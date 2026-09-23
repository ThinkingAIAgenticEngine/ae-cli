import type { Command, RuntimeContext } from '../../../framework/types.js';
import { callDataopsFieldMutationApi } from '../shared.js';

const toolName = 'datatable_delete_table_field';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    tableName: ctx.str('tableName'),
    fieldName: ctx.str('fieldName'),
  };
}

export const deleteTableField: Command = {
  service: 'dataops_datatable',
  command: '+delete_table_field',
  description: 'Delete one ordinary field from a TASK_ENV Hive physical table in DEV. This is high risk; PROD is unchanged until a separate publish.',
  helpText: 'Use global --dry-run to preview without confirmation. Actual deletion requires confirmation; pass global --yes only after explicit user authorization.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'tableName', type: 'string', required: true, desc: 'Exact TASK_ENV physical table name' },
    { name: 'fieldName', type: 'string', required: true, desc: 'Exact existing field name to delete' },
  ],
  risk: 'high-risk-write',
  dryRun: async (ctx) => callDataopsFieldMutationApi(ctx, toolName, {
    ...buildArgs(ctx),
    preview: true,
  }),
  execute: async (ctx) => callDataopsFieldMutationApi(ctx, toolName, buildArgs(ctx)),
};
