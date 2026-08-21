import type { Command } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { ASK_API_PATH as API_PATH, type AskExecutionResponse } from './ask-shared.js';

const MAX_EXECUTION_ID_LEN = 64;

function executionIdFrom(ctx: { str: (name: string) => string }): string {
  return ctx.str('execution-id').trim();
}

export const askStatus: Command = {
  service: 'kb',
  command: '+ask-status',
  description:
    'Query the status of an in-progress or completed knowledge base ask execution (GET /agent/api/external/knowledge-bases/ask?executionId=<id>). Does not poll; returns the current state.',
  flags: [
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
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}?executionId=${encodeURIComponent(executionIdFrom(ctx))}`,
  }),
  execute: async (ctx) => {
    const executionId = executionIdFrom(ctx);
    return (await kbApi(ctx, 'GET', API_PATH, { executionId })) as AskExecutionResponse;
  },
};
