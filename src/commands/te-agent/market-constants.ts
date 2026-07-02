/**
 * Shared enums for MCP/Skill market commands.
 *
 * Categories, market scopes, and sort options are hardcoded on the te-claude
 * side (src/lib/market-categories.ts); there is no backend enumeration API.
 * The CLI mirrors these constants so flags can be validated locally and the
 * accepted values can be advertised in `--help`.
 */

import type { RuntimeContext } from '../../framework/types.js';

// Skill categories shared by MCP and Skill market items.
export const MARKET_CATEGORIES = [
  'ae_preset',
  'dev_tool',
  'search_tool',
  'data_query',
  'content_gen',
  'enterprise',
  'life',
  'automation',
  'other',
] as const;

// Market scope filter. `custom` maps to personal scope (only items owned by the
// current user); `all` = system + company (same company) + personal.
export const MARKET_SCOPES = ['all', 'system', 'company', 'custom'] as const;

// Market sort options. `calls` sorts MCP by call count and Skill by download count.
export const MARKET_SORTS = ['newest', 'calls', 'likes'] as const;

// Skill submission (approval) statuses.
export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

// Skill share list direction.
export const SHARE_DIRECTIONS = ['received', 'sent'] as const;

// Skill share statuses.
export const SHARE_STATUSES = ['pending', 'accepted', 'rejected'] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export function isValidMarketCategory(key?: string): boolean {
  return !!key && (MARKET_CATEGORIES as readonly string[]).includes(key);
}

// Build the market list query string from the standard market flags
// (--scope / --category / --search / --sort / --limit / --offset).
// Shared by +list-mcp-market and +list-skill-market for both dry-run and execute.
export function buildMarketQuery(ctx: RuntimeContext): URLSearchParams {
  const params = new URLSearchParams();
  params.set('scope', ctx.str('scope') || 'all');
  const category = ctx.str('category');
  if (category) params.set('category', category);
  const search = ctx.str('search');
  if (search) params.set('search', search);
  params.set('sort', ctx.str('sort') || 'newest');
  params.set('limit', String(ctx.num('limit') || 50));
  params.set('offset', String(ctx.num('offset') || 0));
  return params;
}
