import fs from 'node:fs';
import path from 'node:path';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases/schema';
const MAX_CUSTOM_INSTRUCTIONS_CHARS = 10000;

function getCustomInstructions(ctx: RuntimeContext): string {
  const inline = ctx.str('custom-instructions');
  const file = ctx.str('custom-instructions-file');
  if (inline && file) {
    throw new Error('Use either --custom-instructions or --custom-instructions-file, not both.');
  }
  const content = file ? fs.readFileSync(path.resolve(file), 'utf8') : inline;
  if (file && !content.trim()) {
    throw new Error('--custom-instructions-file is empty.');
  }
  if ([...content].length > MAX_CUSTOM_INSTRUCTIONS_CHARS) {
    throw new Error('Custom instructions exceed 10000 characters.');
  }
  return content;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
  };

  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  if (scope) body.scope = scope;

  if (ctx.bool('force')) body.force = true;

  const model = ctx.str('model');
  if (model) body.model = model;

  const customInstructions = getCustomInstructions(ctx);
  if (customInstructions) body.customInstructions = customInstructions;

  return body;
}

export async function executeSchema(
  ctx: RuntimeContext,
  api: typeof kbApi = kbApi,
): Promise<unknown> {
  return api(ctx, 'POST', API_PATH, {}, buildBody(ctx), {
    preserveBusinessErrorCode: true,
  });
}

export const schema: Command = {
  service: 'kb',
  command: '+schema',
  description: 'Generate the compile schema for a knowledge base via POST /agent/api/external/knowledge-bases/schema.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name (looked up personal → company)' },
    { name: 'scope', type: 'string', required: false, desc: 'Exact knowledge base scope: personal | company (omit for personal → company fallback)' },
    { name: 'force', type: 'boolean', required: false, desc: 'Preempt generation even when status is `generating` (use only for stuck recovery)' },
    { name: 'model', type: 'string', required: false, desc: 'Optional model reference: Model.id, legacy modelId, or modelId::scope' },
    {
      name: 'custom-instructions',
      type: 'string',
      required: false,
      sensitive: true,
      desc: 'Optional per-run instructions for generating this knowledge base schema',
    },
    {
      name: 'custom-instructions-file',
      type: 'string',
      required: false,
      sensitive: true,
      desc: 'Read optional per-run schema generation instructions from a UTF-8 text file',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    getExternalKnowledgeBaseTargetScope(ctx);
    getCustomInstructions(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: executeSchema,
};
