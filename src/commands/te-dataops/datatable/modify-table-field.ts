import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { callDataopsFieldMutationApi } from '../shared.js';

const toolName = 'datatable_modify_table_field';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    tableName: ctx.str('tableName'),
    fieldName: ctx.str('fieldName'),
    fieldType: ctx.str('fieldType') || undefined,
    comment: ctx.str('comment') || undefined,
    clearComment: ctx.bool('clearComment') || undefined,
  };
}

export const modifyTableField: Command = {
  service: 'dataops_datatable',
  command: '+modify_table_field',
  description: 'Modify the type and/or physical comment of one ordinary TASK_ENV Hive table field in DEV. PROD is unchanged and must be published separately.',
  helpText: 'Provide --fieldType, --comment, or --clearComment; --comment and --clearComment are mutually exclusive. Use global --dry-run for a server semantic preview.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'tableName', type: 'string', required: true, desc: 'Exact TASK_ENV physical table name' },
    { name: 'fieldName', type: 'string', required: true, desc: 'Exact existing field name' },
    { name: 'fieldType', type: 'string', required: false, desc: 'Optional complete Trino-compatible target type' },
    { name: 'comment', type: 'string', required: false, desc: 'Set the physical field comment' },
    { name: 'clearComment', type: 'boolean', required: false, desc: 'Clear the physical field comment' },
  ],
  validate: (ctx) => {
    const hasFieldType = ctx.str('fieldType') !== '';
    const hasComment = ctx.str('comment') !== '';
    const clearComment = ctx.bool('clearComment');
    if (!hasFieldType && !hasComment && !clearComment) {
      throw new CliValidationError(
        'At least one field change is required.',
        {
          code: 'MISSING_FIELD_CHANGE',
          hint: 'Use --fieldType, --comment, or --clearComment.',
        },
      );
    }
    if (hasComment && clearComment) {
      throw new CliValidationError(
        '--comment and --clearComment cannot be used together.',
        {
          code: 'CONFLICTING_COMMENT_CHANGE',
          hint: 'Set a comment with --comment, or remove it with --clearComment.',
        },
      );
    }
  },
  risk: 'write',
  dryRun: async (ctx) => callDataopsFieldMutationApi(ctx, toolName, {
    ...buildArgs(ctx),
    preview: true,
  }),
  execute: async (ctx) => callDataopsFieldMutationApi(ctx, toolName, buildArgs(ctx)),
};
