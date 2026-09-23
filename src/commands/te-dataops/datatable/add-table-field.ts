import type { Command, RuntimeContext } from '../../../framework/types.js';
import { callDataopsFieldMutationApi } from '../shared.js';

const toolName = 'datatable_add_table_field';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    tableName: ctx.str('tableName'),
    fieldName: ctx.str('fieldName'),
    fieldType: ctx.str('fieldType'),
    comment: ctx.str('comment') || undefined,
  };
}

export const addTableField: Command = {
  service: 'dataops_datatable',
  command: '+add_table_field',
  description: 'Append one nullable ordinary field to a TASK_ENV Hive physical table in DEV. PROD is unchanged and must be published separately.',
  helpText: 'Use global --dry-run to request a server semantic preview without writing.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'tableName', type: 'string', required: true, desc: 'Exact TASK_ENV physical table name' },
    { name: 'fieldName', type: 'string', required: true, desc: 'Field name to append' },
    { name: 'fieldType', type: 'string', required: true, desc: 'Complete Trino-compatible field type, for example bigint or decimal(18,2)' },
    { name: 'comment', type: 'string', required: false, desc: 'Optional physical field comment' },
  ],
  risk: 'write',
  dryRun: async (ctx) => callDataopsFieldMutationApi(ctx, toolName, {
    ...buildArgs(ctx),
    preview: true,
  }),
  execute: async (ctx) => callDataopsFieldMutationApi(ctx, toolName, buildArgs(ctx)),
};
