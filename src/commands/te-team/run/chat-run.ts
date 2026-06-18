import type { Command, RuntimeContext } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_RUN_PATH } from '../shared.js';

const CHAT_PATH = `${BASE_RUN_PATH}/chat`;

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    teamId: ctx.str('team-id'),
    input: ctx.str('input'),
  };
  const sessionId = ctx.str('session-id');
  if (sessionId) body.sessionId = sessionId;
  return body;
}

export const chatRun: Command = {
  service: 'team',
  command: '+run-chat',
  description: 'Chat with a team in multi-turn mode. Auto-resumes if a run is in waiting_user state.',
  flags: [
    { name: 'team-id', type: 'string', required: true, desc: 'Team ID' },
    { name: 'input', type: 'string', required: true, desc: 'User input' },
    { name: 'session-id', type: 'string', required: false, desc: 'Existing session ID for continuing a conversation' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${CHAT_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', CHAT_PATH, {}, buildBody(ctx)),
};
