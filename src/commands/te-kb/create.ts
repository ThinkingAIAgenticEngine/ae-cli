import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/create';
const VALID_SCOPES = new Set(['personal', 'company']);

function getScope(ctx: RuntimeContext): string {
  const scope = ctx.str('scope') || 'company';
  validateScope(scope);
  return scope;
}

function validateScope(scope: string): void {
  if (!VALID_SCOPES.has(scope)) {
    throw new Error(`Invalid --scope: ${scope}. Must be one of: personal | company`);
  }
}

function normalizeTags(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error('--tags must be a JSON array of strings, e.g. \'["t1","t2"]\'');
  }
  const tags: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') {
      throw new Error(`--tags entries must be strings (got: ${JSON.stringify(v)})`);
    }
    const t = v.trim();
    if (t) tags.push(t);
  }
  return tags;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    scope: getScope(ctx),
    name: ctx.str('name'),
  };

  const description = ctx.str('description');
  if (description) body.description = description;

  const tags = normalizeTags(ctx.json('tags'));
  if (tags && tags.length > 0) body.tags = tags;

  const projectId = ctx.str('project-id');
  if (projectId) body.projectId = projectId;

  const projectName = ctx.str('project-name');
  if (projectName) body.projectName = projectName;

  return body;
}

export const create: Command = {
  service: 'kb',
  command: '+new',
  description: 'Create a new knowledge.',
  flags: [
    { name: 'scope', type: 'string', required: false, default: 'company', desc: 'Knowledge base scope: personal | company (default: company)' },
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name (≤30 chars, unique per scope)' },
    { name: 'description', type: 'string', required: false, desc: 'Optional description (≤200 chars)' },
    { name: 'tags', type: 'json', required: false, desc: 'Optional JSON array of tags (max 2, each ≤15 chars). Example: \'["t1","t2"]\'' },
    { name: 'project-id', type: 'string', required: false, desc: 'Optional project ID to bind' },
    { name: 'project-name', type: 'string', required: false, desc: 'Optional project display name' },
  ],
  risk: 'write',
  validate: (ctx) => {
    getScope(ctx);
    normalizeTags(ctx.json('tags'));
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
