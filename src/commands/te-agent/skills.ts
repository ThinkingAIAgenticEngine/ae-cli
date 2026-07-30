/**
 * ae-cli agent Skill management commands
 *
 * +list-skills   — list Skills
 * +add-skill     — create a custom Skill (personal)
 * +del-skill     — delete a personal Skill
 * +toggle-skill  — enable/disable a Skill
 */

import type { Command, RuntimeContext } from '../../framework/types.js';
import { getFromMainApp, postToMainApp, deleteFromMainApp, patchToMainApp } from '../../core/te-agent-client.js';
import {
  MARKET_CATEGORIES,
  MARKET_SCOPES,
  MARKET_SORTS,
  isValidMarketCategory,
  buildMarketQuery,
} from './market-constants.js';
import { assertValidSkillVersion } from './skill-version.js';

const BASE_PATH = '/api/sandbox/agent/skills';
const MARKET_BASE_PATH = '/api/sandbox/agent/skills';

// Build the optional meta body (category / iconEmoji / iconColor) from ctx.
// Returns null when none of the meta flags are provided.
function buildMetaBody(ctx: RuntimeContext): Record<string, string> | null {
  const body: Record<string, string> = {};
  const category = ctx.str('category');
  const iconEmoji = ctx.str('iconEmoji');
  const iconColor = ctx.str('iconColor');
  if (category) body.category = category;
  if (iconEmoji) body.iconEmoji = iconEmoji;
  if (iconColor) body.iconColor = iconColor;
  return Object.keys(body).length > 0 ? body : null;
}

/**
 * Resolve the instructions argument: supports @- to read from stdin
 */
async function resolveInstructions(raw: string): Promise<string> {
  if (raw === '@-') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (!text) throw new Error('stdin is empty; cannot read instructions');
    return text;
  }
  return raw;
}

export const listSkills: Command = {
  service: 'agent',
  command: '+list-skills',
  description: 'List Skills visible to current user',
  flags: [
    {
      name: 'scope',
      type: 'string',
      required: false,
      desc: 'Filter by scope: personal | company | system',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    const scope = ctx.str('scope');
    if (scope && !['personal', 'company', 'system'].includes(scope)) {
      throw new Error('--scope must be personal, company, or system');
    }
  },
  dryRun: (ctx) => {
    const scope = ctx.str('scope');
    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    return { method: 'GET', url: `${BASE_PATH}${qs}` };
  },
  execute: async (ctx) => {
    const scope = ctx.str('scope');
    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    return getFromMainApp(`${BASE_PATH}${qs}`);
  },
};

export const addSkill: Command = {
  service: 'agent',
  command: '+add-skill',
  description: 'Create a custom Skill (personal or company scope)',
  flags: [
    {
      name: 'name',
      type: 'string',
      required: true,
      desc: 'Skill name (1-80 chars)',
    },
    {
      name: 'description',
      type: 'string',
      required: true,
      desc: 'Skill description',
    },
    {
      name: 'instructions',
      type: 'string',
      required: true,
      desc: 'Skill instructions (use @- to read from stdin)',
    },
    {
      name: 'display-name',
      type: 'string',
      required: false,
      desc: 'Display name (max 100)',
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      desc: `Market category key: ${MARKET_CATEGORIES.join(' | ')}`,
    },
    {
      name: 'icon-emoji',
      type: 'string',
      required: false,
      desc: 'Market icon emoji (e.g. robot)',
    },
    {
      name: 'icon-color',
      type: 'string',
      required: false,
      desc: 'Market icon color (e.g. #1E76F0)',
    },
    {
      name: 'scope',
      type: 'string',
      required: false,
      default: 'personal',
      desc: 'Target scope: personal | company',
    },
    {
      name: 'version',
      type: 'string',
      required: false,
      desc: 'Initial content version (major.minor; default 1.0)',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    const name = ctx.str('name');
    if (name.length < 1 || name.length > 80) {
      throw new Error('--name length must be between 1 and 80');
    }
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
    const scope = ctx.str('scope');
    if (scope && !['personal', 'company'].includes(scope)) {
      throw new Error('--scope must be personal or company');
    }
    const version = ctx.str('version');
    if (version) assertValidSkillVersion(version);
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {
      name: ctx.str('name'),
      description: ctx.str('description'),
      instructions: ctx.str('instructions') === '@-' ? '(from stdin)' : ctx.str('instructions'),
      displayName: ctx.str('displayName') || undefined,
      scope: ctx.str('scope') || 'personal',
      version: ctx.str('version') || undefined,
    };
    const meta = buildMetaBody(ctx);
    if (meta) body._meta = meta; // applied via a follow-up PATCH /api/sandbox/agent/skills/[id]/meta
    return { method: 'POST', url: BASE_PATH, body };
  },
  execute: async (ctx) => {
    const instructions = await resolveInstructions(ctx.str('instructions'));
    const created = await postToMainApp<{
      item: { id: string; name: string; displayName: string | null };
    }>(BASE_PATH, {
      name: ctx.str('name'),
      description: ctx.str('description'),
      instructions,
      displayName: ctx.str('displayName') || undefined,
      scope: ctx.str('scope') || 'personal',
      version: ctx.str('version') || undefined,
    });
    const id = created?.item?.id;
    const meta = buildMetaBody(ctx);
    if (id && meta) {
      try {
        await patchToMainApp(`${MARKET_BASE_PATH}/${encodeURIComponent(id)}/meta`, meta);
      } catch (err: any) {
        process.stderr.write(`Warning: Skill created but meta update failed: ${err?.message ?? err}\n`);
      }
    }
    return created;
  },
};

export const delSkill: Command = {
  service: 'agent',
  command: '+del-skill',
  description: 'Delete a personal Skill (physical delete)',
  flags: [
    {
      name: 'id',
      type: 'string',
      required: true,
      desc: 'Skill record ID (CUID)',
    },
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`,
  }),
  execute: async (ctx) => {
    return deleteFromMainApp(`${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`);
  },
};

export const toggleSkill: Command = {
  service: 'agent',
  command: '+toggle-skill',
  description: 'Enable or disable a Skill',
  flags: [
    {
      name: 'id',
      type: 'string',
      required: true,
      desc: 'Skill record ID (CUID)',
    },
    {
      name: 'enabled',
      type: 'boolean',
      required: true,
      desc: 'true to enable, false to disable',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'PATCH',
    url: BASE_PATH,
    body: { id: ctx.str('id'), enabled: ctx.bool('enabled') },
  }),
  execute: async (ctx) => {
    return patchToMainApp(BASE_PATH, {
      id: ctx.str('id'),
      enabled: ctx.bool('enabled'),
    });
  },
};

export const listSkillMarket: Command = {
  service: 'agent',
  command: '+list-skill-market',
  description: 'List Skills from the market (only approved items; system/company/personal)',
  flags: [
    {
      name: 'scope',
      type: 'string',
      required: false,
      default: 'all',
      desc: `Market scope: ${MARKET_SCOPES.join(' | ')} (custom = personal)`,
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      desc: `Category key: ${MARKET_CATEGORIES.join(' | ')}`,
    },
    {
      name: 'search',
      type: 'string',
      required: false,
      desc: 'Fuzzy search on name/displayName/description',
    },
    {
      name: 'sort',
      type: 'string',
      required: false,
      default: 'newest',
      desc: `Sort: ${MARKET_SORTS.join(' | ')} (calls = downloads)`,
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      default: 50,
      desc: 'Page size (1-100, default 50)',
    },
    {
      name: 'offset',
      type: 'number',
      required: false,
      default: 0,
      desc: 'Page offset (>=0, default 0)',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    const scope = ctx.str('scope');
    if (scope && !(MARKET_SCOPES as readonly string[]).includes(scope)) {
      throw new Error(`--scope must be one of: ${MARKET_SCOPES.join(', ')}`);
    }
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
    const sort = ctx.str('sort');
    if (sort && !(MARKET_SORTS as readonly string[]).includes(sort)) {
      throw new Error(`--sort must be one of: ${MARKET_SORTS.join(', ')}`);
    }
  },
  dryRun: (ctx) => ({
    method: 'GET',
    url: `${MARKET_BASE_PATH}/market?${buildMarketQuery(ctx).toString()}`,
  }),
  execute: async (ctx) => {
    return getFromMainApp(`${MARKET_BASE_PATH}/market?${buildMarketQuery(ctx).toString()}`);
  },
};

export const setSkillMeta: Command = {
  service: 'agent',
  command: '+set-skill-meta',
  description: 'Update a Skill market meta (category / icon). Company scope requires root; system is read-only.',
  flags: [
    {
      name: 'id',
      type: 'string',
      required: true,
      desc: 'Skill record ID (CUID)',
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      desc: `Category key: ${MARKET_CATEGORIES.join(' | ')}`,
    },
    {
      name: 'icon-emoji',
      type: 'string',
      required: false,
      desc: 'Market icon emoji (e.g. robot)',
    },
    {
      name: 'icon-color',
      type: 'string',
      required: false,
      desc: 'Market icon color (e.g. #1E76F0)',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
    if (!buildMetaBody(ctx)) {
      throw new Error('Provide at least one of --category / --icon-emoji / --icon-color');
    }
  },
  dryRun: (ctx) => ({
    method: 'PATCH',
    url: `${MARKET_BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/meta`,
    body: buildMetaBody(ctx),
  }),
  execute: async (ctx) => {
    return patchToMainApp(`${MARKET_BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/meta`, buildMetaBody(ctx));
  },
};

export const copySkill: Command = {
  service: 'agent',
  command: '+copy-skill',
  description: 'Copy a system/company Skill to a personal copy (independent duplicate)',
  flags: [
    {
      name: 'id',
      type: 'string',
      required: true,
      desc: 'Source Skill record ID (CUID, system or company scope)',
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      desc: `Market category key for the copy: ${MARKET_CATEGORIES.join(' | ')}`,
    },
    {
      name: 'icon-emoji',
      type: 'string',
      required: false,
      desc: 'Override market icon emoji (e.g. robot)',
    },
    {
      name: 'icon-color',
      type: 'string',
      required: false,
      desc: 'Override market icon color (e.g. #1E76F0)',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${MARKET_BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/copy`,
    body: buildMetaBody(ctx) ?? {},
  }),
  execute: async (ctx) => {
    return postToMainApp(`${MARKET_BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/copy`, buildMetaBody(ctx) ?? {});
  },
};
