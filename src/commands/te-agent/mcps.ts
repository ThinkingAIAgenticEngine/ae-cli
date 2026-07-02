/**
 * ae-cli agent MCP server management commands
 *
 * +list-mcps   — list MCP servers
 * +add-mcp     — add an MCP server (personal)
 * +del-mcp     — delete a personal MCP server
 * +toggle-mcp  — enable/disable an MCP server
 */

import type { Command, RuntimeContext } from '../../framework/types.js';
import {
  getFromMainApp,
  postToMainApp,
  deleteFromMainApp,
  patchToMainApp,
} from '../../core/te-agent-client.js';
import {
  MARKET_CATEGORIES,
  MARKET_SCOPES,
  MARKET_SORTS,
  isValidMarketCategory,
  buildMarketQuery,
} from './market-constants.js';

const BASE_PATH = '/api/sandbox/agent/mcp-servers';
const MARKET_BASE_PATH = '/api/mcp-servers';

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

export const listMcps: Command = {
  service: 'agent',
  command: '+list-mcps',
  description: 'List MCP servers visible to current user',
  flags: [
    { name: 'scope', type: 'string', required: false, desc: 'Filter by scope: personal | company | system' },
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

export const addMcp: Command = {
  service: 'agent',
  command: '+add-mcp',
  description: 'Add an MCP server (personal scope)',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Server name (2-64 chars, letter start, [a-zA-Z0-9_-])' },
    { name: 'url', type: 'string', required: true, desc: 'MCP server URL' },
    { name: 'display-name', type: 'string', required: false, desc: 'Display name (max 100)' },
    { name: 'description', type: 'string', required: false, desc: 'Description (max 255)' },
    { name: 'transport', type: 'string', required: false, default: 'http', desc: 'Transport: sse | http' },
    { name: 'headers', type: 'json', required: false, desc: 'HTTP headers as JSON object' },
    { name: 'category', type: 'string', required: false, desc: `Market category key: ${MARKET_CATEGORIES.join(' | ')}` },
    { name: 'icon-emoji', type: 'string', required: false, desc: 'Market icon emoji (e.g. robot)' },
    { name: 'icon-color', type: 'string', required: false, desc: 'Market icon color (e.g. #1E76F0)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const name = ctx.str('name');
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      throw new Error('--name must start with a letter and contain only letters, digits, _, or -');
    }
    if (name.length < 2 || name.length > 64) {
      throw new Error('--name length must be between 2 and 64');
    }
    try { new URL(ctx.str('url')); } catch { throw new Error('--url must be a valid URL'); }
    // Protocol allowlist: block file://, ftp://, and other non-HTTP protocols commonly used in SSRF
    if (!/^https?:\/\//i.test(ctx.str('url'))) {
      throw new Error('--url only supports http:// or https:// protocols');
    }
    const transport = ctx.str('transport');
    if (transport && !['sse', 'http'].includes(transport)) {
      throw new Error('--transport must be sse or http');
    }
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {
      name: ctx.str('name'),
      url: ctx.str('url'),
      displayName: ctx.str('displayName') || undefined,
      description: ctx.str('description') || undefined,
      transport: ctx.str('transport') || 'http',
      headers: ctx.json('headers') || undefined,
    };
    const meta = buildMetaBody(ctx);
    if (meta) body._meta = meta; // applied via a follow-up PATCH /api/mcp-servers/[id]/meta
    return { method: 'POST', url: BASE_PATH, body };
  },
  execute: async (ctx) => {
    const created = await postToMainApp<{ item: { id: string; name: string; displayName: string | null } }>(BASE_PATH, {
      name: ctx.str('name'),
      url: ctx.str('url'),
      displayName: ctx.str('displayName') || undefined,
      description: ctx.str('description') || undefined,
      transport: ctx.str('transport') || 'http',
      headers: ctx.json('headers') || undefined,
    });
    const id = created?.item?.id;
    const meta = buildMetaBody(ctx);
    if (id && meta) {
      try {
        await patchToMainApp(`${MARKET_BASE_PATH}/${encodeURIComponent(id)}/meta`, meta);
      } catch (err: any) {
        process.stderr.write(`Warning: MCP created but meta update failed: ${err?.message ?? err}\n`);
      }
    }
    return created;
  },
};

export const delMcp: Command = {
  service: 'agent',
  command: '+del-mcp',
  description: 'Delete a personal MCP server',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`,
  }),
  execute: async (ctx) => {
    return deleteFromMainApp(`${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`);
  },
};

export const toggleMcp: Command = {
  service: 'agent',
  command: '+toggle-mcp',
  description: 'Enable or disable an MCP server',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'true to enable, false to disable' },
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

export const listMcpMarket: Command = {
  service: 'agent',
  command: '+list-mcp-market',
  description: 'List MCP servers from the market (system/company/personal)',
  flags: [
    { name: 'scope', type: 'string', required: false, default: 'all', desc: `Market scope: ${MARKET_SCOPES.join(' | ')} (custom = personal)` },
    { name: 'category', type: 'string', required: false, desc: `Category key: ${MARKET_CATEGORIES.join(' | ')}` },
    { name: 'search', type: 'string', required: false, desc: 'Fuzzy search on name/displayName/description/url' },
    { name: 'sort', type: 'string', required: false, default: 'newest', desc: `Sort: ${MARKET_SORTS.join(' | ')}` },
    { name: 'limit', type: 'number', required: false, default: 50, desc: 'Page size (1-100, default 50)' },
    { name: 'offset', type: 'number', required: false, default: 0, desc: 'Page offset (>=0, default 0)' },
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

export const setMcpMeta: Command = {
  service: 'agent',
  command: '+set-mcp-meta',
  description: 'Update an MCP server market meta (category / icon). Company scope requires root; system is read-only.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
    { name: 'category', type: 'string', required: false, desc: `Category key: ${MARKET_CATEGORIES.join(' | ')}` },
    { name: 'icon-emoji', type: 'string', required: false, desc: 'Market icon emoji (e.g. robot)' },
    { name: 'icon-color', type: 'string', required: false, desc: 'Market icon color (e.g. #1E76F0)' },
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
    return patchToMainApp(
      `${MARKET_BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/meta`,
      buildMetaBody(ctx),
    );
  },
};
