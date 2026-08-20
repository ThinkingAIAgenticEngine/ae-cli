/**
 * ae-cli agent MCP server management commands
 *
 * +list-mcps   — list MCP servers
 * +add-mcp     — add an MCP server (personal)
 * +del-mcp     — delete a personal MCP server
 * +toggle-mcp  — enable/disable an MCP server
 *
 * Market / meta（第一步迁移）:
 * +list-mcp-market / +set-mcp-meta
 *
 * 第二步能力补齐:
 * +update-mcp                     — update MCP config (PATCH /mcp-servers/[id])
 * +mcp-tools                      — list MCP tools (GET /mcp-servers/[id]/tools)
 * +mcp-auth-start                 — start MCP OAuth (POST /mcp-servers/[id]/auth/start, cliMode)
 * +mcp-auth-status                — query MCP OAuth status (GET /mcp-servers/[id]/auth/status)
 * +mcp-auth-disconnect            — disconnect MCP OAuth (POST /mcp-servers/[id]/auth/disconnect)
 * +list-mcp-credentials           — list per-user MCP credentials (GET /mcp-credentials)
 * +set-mcp-credential             — upsert per-user MCP credential (POST /mcp-credentials)
 * +auto-provision-mcp-credentials — auto-provision system MCP credentials (POST /mcp-credentials/auto-provision)
 * +mcp-token                      — get plaintext MCP token (GET /mcp-credentials/mcp-token)
 *
 * 统计:
 * +mcp-stats                      — MCP call statistics for the last N days (GET /mcp-servers/stats)
 */

import type { Command, RuntimeContext } from '../../framework/types.js';
import {
  deleteAgentApi,
  getAgentApi,
  patchAgentApi,
  postAgentApi,
} from './api-client.js';
import {
  MARKET_CATEGORIES,
  MARKET_SCOPES,
  MARKET_SORTS,
  isValidMarketCategory,
  buildMarketQuery,
} from './market-constants.js';

const BASE_PATH = '/api/sandbox/agent/mcp-servers';
const MARKET_BASE_PATH = '/api/sandbox/agent/mcp-servers';
const CRED_BASE_PATH = '/api/sandbox/agent/mcp-credentials';
const STATS_PATH = '/api/sandbox/agent/mcp-servers/stats';

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
    return getAgentApi(ctx, `${BASE_PATH}${qs}`);
  },
};

export const addMcp: Command = {
  service: 'agent',
  command: '+add-mcp',
  description: 'Add an MCP server (personal or company scope)',
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
    { name: 'scope', type: 'string', required: false, default: 'personal', desc: 'Target scope: personal | company' },
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
    const scope = ctx.str('scope');
    if (scope && !['personal', 'company'].includes(scope)) {
      throw new Error('--scope must be personal or company');
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
      scope: ctx.str('scope') || 'personal',
    };
    const meta = buildMetaBody(ctx);
    if (meta) body._meta = meta; // applied via a follow-up PATCH /api/sandbox/agent/mcp-servers/[id]/meta
    return { method: 'POST', url: BASE_PATH, body };
  },
  execute: async (ctx) => {
    const created = await postAgentApi<{ item: { id: string; name: string; displayName: string | null } }>(ctx, BASE_PATH, {
      name: ctx.str('name'),
      url: ctx.str('url'),
      displayName: ctx.str('displayName') || undefined,
      description: ctx.str('description') || undefined,
      transport: ctx.str('transport') || 'http',
      headers: ctx.json('headers') || undefined,
      scope: ctx.str('scope') || 'personal',
    });
    const id = created?.item?.id;
    const meta = buildMetaBody(ctx);
    if (id && meta) {
      try {
        await patchAgentApi(ctx, `${MARKET_BASE_PATH}/${encodeURIComponent(id)}/meta`, meta);
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
  risk: 'high-risk-write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`,
  }),
  execute: async (ctx) => {
    return deleteAgentApi(ctx, `${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`);
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
    return patchAgentApi(ctx, BASE_PATH, {
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
    return getAgentApi(ctx, `${MARKET_BASE_PATH}/market?${buildMarketQuery(ctx).toString()}`);
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
    return patchAgentApi(
      ctx,
      `${MARKET_BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/meta`,
      buildMetaBody(ctx),
    );
  },
};

// ============================================================================
// 第二步：能力补齐 — MCP 配置更新 / 工具列表 / OAuth / 凭证
// ============================================================================

const UPDATE_TRANSPORTS = ['sse', 'http', 'streamable-http'] as const;
const UPDATE_AUTH_MODES = ['none', 'oauth2', 'header', 'manual'] as const;
const CRED_AUTH_TYPES = ['oauth', 'apikey'] as const;

// Build the PATCH body for +update-mcp. Only includes fields that are explicitly
// provided (PATCH semantics). --enabled is a string flag ("true"/"false") so we
// can distinguish "not provided" (leave unchanged) from "set to false".
function buildUpdateBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const name = ctx.str('name');
  if (name) body.name = name;
  const url = ctx.str('url');
  if (url) body.url = url;
  const displayName = ctx.str('displayName');
  if (displayName) body.displayName = displayName;
  const description = ctx.str('description');
  if (description) body.description = description;
  const transport = ctx.str('transport');
  if (transport) body.transport = transport;
  const headers = ctx.json('headers');
  if (headers) body.headers = headers;
  const secretHeaders = ctx.json('secretHeaders');
  if (secretHeaders) body.secretHeaders = secretHeaders;
  const authMode = ctx.str('authMode');
  if (authMode) body.authMode = authMode;
  const enabledStr = ctx.str('enabled');
  if (enabledStr === 'true') body.enabled = true;
  else if (enabledStr === 'false') body.enabled = false;
  // autoRename: only include when true (false is the server default; including it
  // alone would cause a no_valid_field error since it is a modifier, not a field).
  if (ctx.bool('autoRename')) body.autoRename = true;
  return body;
}

export const updateMcp: Command = {
  service: 'agent',
  command: '+update-mcp',
  description: 'Update an MCP server config (personal owner / company root / system read-only)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
    { name: 'name', type: 'string', required: false, desc: 'Server name (2-64 chars, letter start, [a-zA-Z0-9_-])' },
    { name: 'url', type: 'string', required: false, desc: 'MCP server URL (http:// or https:// only)' },
    { name: 'display-name', type: 'string', required: false, desc: 'Display name (max 100)' },
    { name: 'description', type: 'string', required: false, desc: 'Description (max 255)' },
    { name: 'transport', type: 'string', required: false, desc: `Transport: ${UPDATE_TRANSPORTS.join(' | ')}` },
    { name: 'headers', type: 'json', required: false, desc: 'HTTP headers as JSON object' },
    { name: 'secret-headers', type: 'json', required: false, desc: 'Secret headers as JSON object (encrypted server-side)' },
    { name: 'auth-mode', type: 'string', required: false, desc: `Auth mode: ${UPDATE_AUTH_MODES.join(' | ')}` },
    { name: 'enabled', type: 'string', required: false, desc: 'Set enabled state: true | false (omit to leave unchanged)' },
    { name: 'auto-rename', type: 'boolean', required: false, desc: 'Auto-rename on name conflict (default false)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const name = ctx.str('name');
    if (name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      throw new Error('--name must start with a letter and contain only letters, digits, _, or -');
    }
    const url = ctx.str('url');
    if (url) {
      try { new URL(url); } catch { throw new Error('--url must be a valid URL'); }
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('--url only supports http:// or https:// protocols');
      }
    }
    const transport = ctx.str('transport');
    if (transport && !(UPDATE_TRANSPORTS as readonly string[]).includes(transport)) {
      throw new Error(`--transport must be one of: ${UPDATE_TRANSPORTS.join(', ')}`);
    }
    const authMode = ctx.str('authMode');
    if (authMode && !(UPDATE_AUTH_MODES as readonly string[]).includes(authMode)) {
      throw new Error(`--auth-mode must be one of: ${UPDATE_AUTH_MODES.join(', ')}`);
    }
    const enabledStr = ctx.str('enabled');
    if (enabledStr && enabledStr !== 'true' && enabledStr !== 'false') {
      throw new Error('--enabled must be true or false');
    }
    // At least one update field must be provided (id alone is not enough).
    const body = buildUpdateBody(ctx);
    if (Object.keys(body).length === 0) {
      throw new Error('Provide at least one field to update: --name / --url / --display-name / --description / --transport / --headers / --secret-headers / --auth-mode / --enabled / --auto-rename');
    }
  },
  dryRun: (ctx) => ({
    method: 'PATCH',
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`,
    body: buildUpdateBody(ctx),
  }),
  execute: async (ctx) => {
    return patchAgentApi(
      ctx,
      `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}`,
      buildUpdateBody(ctx),
    );
  },
};

export const mcpTools: Command = {
  service: 'agent',
  command: '+mcp-tools',
  description: 'List tools exposed by an MCP server (with OAuth auto-refresh)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/tools`,
  }),
  execute: async (ctx) => {
    return getAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/tools`);
  },
};

export const mcpAuthStart: Command = {
  service: 'agent',
  command: '+mcp-auth-start',
  description: 'Start MCP OAuth flow (CLI mode: get authorizeUrl, then poll +mcp-auth-status)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
    { name: 'redirect-after', type: 'string', required: false, desc: 'URL to redirect to after OAuth completes (must be same-origin as the service base URL)' },
    { name: 'cli', type: 'boolean', required: false, default: true, desc: 'CLI mode (always true on sandbox endpoint; server derives the callback URL)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/auth/start`,
    body: {
      cliMode: true,
      redirectAfter: ctx.str('redirectAfter') || undefined,
    },
  }),
  execute: async (ctx) => {
    // The sandbox endpoint always sets cliMode=true server-side; the --cli flag is
    // for documentation/compat only and is not sent in the body.
    const result = await postAgentApi<{
      authorizeUrl: string;
      expiresAt: string;
      redirectUri: string;
      server: { id: string; name: string; displayName: string | null; scope: string; providerKey: string | null };
    }>(
      ctx,
      `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/auth/start`,
      {
        redirectAfter: ctx.str('redirectAfter') || undefined,
      },
    );
    // TTY-aware guidance: tell the user to open the authorizeUrl in a browser,
    // then poll +mcp-auth-status.
    if (result?.authorizeUrl && (process.stderr.isTTY || process.stdout.isTTY)) {
      const id = ctx.str('id');
      process.stderr.write(
        `\n请在浏览器中打开以下 URL 完成授权：\n${result.authorizeUrl}\n\n` +
        `授权完成后，运行以下命令轮询授权状态：\n` +
        `ae-cli agent +mcp-auth-status --id ${id}\n\n`,
      );
    }
    return result;
  },
};

export const mcpAuthStatus: Command = {
  service: 'agent',
  command: '+mcp-auth-status',
  description: 'Query MCP OAuth authorization status (CLI poll after +mcp-auth-start)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/auth/status`,
  }),
  execute: async (ctx) => {
    return getAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/auth/status`);
  },
};

export const mcpAuthDisconnect: Command = {
  service: 'agent',
  command: '+mcp-auth-disconnect',
  description: 'Disconnect MCP OAuth (clears token and disables the server)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/auth/disconnect`,
  }),
  execute: async (ctx) => {
    return postAgentApi(
      ctx,
      `${BASE_PATH}/${encodeURIComponent(ctx.str('id'))}/auth/disconnect`,
      {},
    );
  },
};

export const listMcpCredentials: Command = {
  service: 'agent',
  command: '+list-mcp-credentials',
  description: 'List per-user credentials for system MCP servers',
  flags: [],
  risk: 'read',
  dryRun: () => ({
    method: 'GET',
    url: CRED_BASE_PATH,
  }),
  execute: async (ctx) => {
    return getAgentApi(ctx, CRED_BASE_PATH);
  },
};

export const setMcpCredential: Command = {
  service: 'agent',
  command: '+set-mcp-credential',
  description: 'Upsert a per-user MCP credential (by mcpServerId + userId)',
  flags: [
    { name: 'mcp-server-id', type: 'string', required: true, desc: 'System MCP server record ID (CUID)' },
    { name: 'auth-type', type: 'string', required: false, default: 'oauth', desc: `Auth type: ${CRED_AUTH_TYPES.join(' | ')}` },
    { name: 'token', type: 'string', required: false, desc: 'Token / API key (plaintext; encrypted server-side)' },
    { name: 'expires-at', type: 'string', required: false, desc: 'ISO 8601 datetime (e.g. 2026-12-31T23:59:59Z)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const authType = ctx.str('authType') || 'oauth';
    if (!(CRED_AUTH_TYPES as readonly string[]).includes(authType)) {
      throw new Error(`--auth-type must be one of: ${CRED_AUTH_TYPES.join(', ')}`);
    }
    const expiresAt = ctx.str('expiresAt');
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (isNaN(d.getTime())) {
        throw new Error('--expires-at must be a valid ISO 8601 datetime');
      }
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: CRED_BASE_PATH,
    body: {
      mcpServerId: ctx.str('mcpServerId'),
      authType: ctx.str('authType') || 'oauth',
      token: ctx.str('token') || undefined,
      expiresAt: ctx.str('expiresAt') || undefined,
    },
  }),
  execute: async (ctx) => {
    return postAgentApi(ctx, CRED_BASE_PATH, {
      mcpServerId: ctx.str('mcpServerId'),
      authType: ctx.str('authType') || 'oauth',
      token: ctx.str('token') || undefined,
      expiresAt: ctx.str('expiresAt') || undefined,
    });
  },
};

export const autoProvisionMcpCredentials: Command = {
  service: 'agent',
  command: '+auto-provision-mcp-credentials',
  description: 'Auto-provision credentials for all system MCP servers using the current access token',
  flags: [
    { name: 'access-token', type: 'string', required: false, desc: 'Access token (defaults to the current session token from ctx.token())' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${CRED_BASE_PATH}/auto-provision`,
    body: {
      accessToken: ctx.str('accessToken') || '<current-session-token>',
    },
  }),
  execute: async (ctx) => {
    const accessToken = ctx.str('accessToken') || await ctx.token();
    return postAgentApi(ctx, `${CRED_BASE_PATH}/auto-provision`, { accessToken });
  },
};

export const mcpToken: Command = {
  service: 'agent',
  command: '+mcp-token',
  description: 'Get the plaintext MCP token (for useMcpToken=true system MCP servers)',
  flags: [],
  risk: 'read',
  dryRun: () => ({
    method: 'GET',
    url: `${CRED_BASE_PATH}/mcp-token`,
  }),
  execute: async (ctx) => {
    const result = await getAgentApi<{ token: string | null }>(ctx, `${CRED_BASE_PATH}/mcp-token`);
    if (process.stderr.isTTY) {
      process.stderr.write(
        `\n注意：返回明文 MCP Token，请妥善保管，避免写入 shell history 或日志。\n\n`,
      );
    }
    return result;
  },
};

export const mcpStats: Command = {
  service: 'agent',
  command: '+mcp-stats',
  description: 'Show MCP call statistics for the last N days (by server / by day)',
  flags: [
    { name: 'days', type: 'number', required: false, default: 30, desc: 'Lookback window in days (1-365, default 30)' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const days = ctx.optionalNum('days');
    if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 365)) {
      throw new Error('--days must be an integer between 1 and 365');
    }
  },
  dryRun: (ctx) => {
    const days = ctx.optionalNum('days') ?? 30;
    return { method: 'GET', url: `${STATS_PATH}?days=${days}` };
  },
  execute: async (ctx) => {
    const days = ctx.optionalNum('days') ?? 30;
    return getAgentApi(ctx, `${STATS_PATH}?days=${days}`);
  },
};
