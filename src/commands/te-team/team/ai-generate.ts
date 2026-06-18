import type { Command, RuntimeContext } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_TEAM_PATH } from '../shared.js';

const AI_GEN_PATH = `${BASE_TEAM_PATH}/ai-generate`;

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { prompt: ctx.str('prompt') };
  const model = ctx.str('model');
  if (model) body.model = model;
  return body;
}

export const aiGenerate: Command = {
  service: 'team',
  command: '+ai-generate',
  description: 'Use AI to generate a team config draft from a goal description.',
  flags: [
    { name: 'prompt', type: 'string', required: true, desc: 'Team goal description (1–2000 chars)' },
    { name: 'model', type: 'string', required: false, desc: 'Model ID to use for generation' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${AI_GEN_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', AI_GEN_PATH, {}, buildBody(ctx)),
};
