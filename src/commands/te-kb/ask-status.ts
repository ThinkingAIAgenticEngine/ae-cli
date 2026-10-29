import type { Command } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { kbExecutionContextRequired } from '../../core/kb-read-context.js';
import { ASK_API_PATH as API_PATH } from './ask-shared.js';

import { CliValidationError } from '../../core/errors.js';

const MAX_EXECUTION_ID_LEN = 64;

function executionIdFrom(ctx: { str: (name: string) => string }): string {
  return ctx.str('execution-id').trim();
}

export const askStatus: Command = {
  service: 'kb',
  command: '+ask-status',
  description:
    'Query an Ask execution. With --source-index, revisit that saved citation at its original version using current permissions; never selects the latest version. Does not poll.',
  flags: [
    {
      name: 'source-index',
      type: 'number',
      required: false,
      min: 0,
      desc: 'Zero-based sourceIndex from a completed Ask source reference. Unversioned historical sources cannot be revisited.',
    },
    {
      name: 'execution-id',
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: MAX_EXECUTION_ID_LEN,
      desc: 'The execution ID returned by kb +ask submission.',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    const index = ctx.optionalNum('source-index');
    if (index !== undefined && (!Number.isSafeInteger(index) || index < 0 || index > 999999999)) {
      throw new CliValidationError('--source-index must be a non-negative integer below 1000000000.');
    }
    const executionId = executionIdFrom(ctx);
    if (!executionId) {
      throw new Error('Invalid --execution-id: must be non-empty.');
    }
    if (executionId.length > MAX_EXECUTION_ID_LEN) {
      throw new Error(
        `Invalid --execution-id length: ${executionId.length}. Must be at most ${MAX_EXECUTION_ID_LEN} characters.`,
      );
    }
  },
  dryRun: (ctx) => ({
    method: 'GET',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}?executionId=${encodeURIComponent(executionIdFrom(ctx))}${ctx.optionalNum('source-index') !== undefined ? `&sourceIndex=${ctx.optionalNum('source-index')}` : ''}`,
  }),
  execute: async (ctx) => {
    const executionId = executionIdFrom(ctx);
    const sourceIndex = ctx.optionalNum('source-index');
    if (sourceIndex !== undefined && kbExecutionContextRequired()) {
      throw new CliValidationError(
        'Historical references cannot be read inside a pinned KB execution. Use this command outside that execution with your current user credentials.',
        { code: 'KB_READ_CONTEXT_REFERENCE_FORBIDDEN' },
      );
    }
    return kbApi(ctx, 'GET', API_PATH, {
      executionId,
      ...(sourceIndex !== undefined ? { sourceIndex } : {}),
    });
  },
};
