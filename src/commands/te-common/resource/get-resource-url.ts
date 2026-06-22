import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

/**
 * F-015: the server returns resource links as RELATIVE paths, e.g.
 *   raw_url:       "/#/panel/panel/3_10"
 *   markdown_link: "[View Resource](/#/panel/panel/3_10)"
 * In a local ae-cli / terminal context those are not clickable. Rewrite relative URL/link fields to
 * absolute by prepending the AE host, so the user can click straight through to the resource.
 */
export function normalizeResourceUrlFields(node: unknown, host: string): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Target URL/link fields (by name) and any value carrying the analysis SPA hash route marker.
      if (/url|link/i.test(key) || value.includes('/#/')) {
        obj[key] = absolutizeRelativeUrls(value, host);
      }
    } else if (value && typeof value === 'object') {
      normalizeResourceUrlFields(value, host);
    }
  }
}

/** Prepend `host` to relative URLs in a string: bare paths ("/x") and markdown link targets ("](/x)"). */
export function absolutizeRelativeUrls(s: string, host: string): string {
  const base = host.replace(/\/+$/, '');
  // markdown / parenthesized relative link targets: ](/path) -> ](base/path); skip protocol-relative "//".
  s = s.replace(/\]\((\/(?!\/)[^)]*)\)/g, `](${base}$1)`);
  // a whole-string relative path value: /path -> base/path (skip protocol-relative "//").
  if (/^\/(?!\/)/.test(s)) s = base + s;
  return s;
}

export const getResourceUrl: Command = {
  service: 'analysis_common',
  command: '+get_resource_url',
  description: 'Generate a clickable Markdown link for a resource by ID and type (absolute URL)',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'resource_type', type: 'string', required: true, desc: 'Resource type: dashboard/report/metric/alert/tag/cluster/data_table/super_event/super_prop_user/super_prop_event/virtual_event/user_virtual_prop/event_virtual_prop' },
    { name: 'resource_id', type: 'number', required: true, desc: 'Numeric resource ID' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'tools/call',
    url: resolveMcpUrl(ctx.mcpUrl(), ctx.host(), 'analysis'),
    body: {
      name: 'get_resource_url',
      arguments: {
        projectId: ctx.num('project_id'),
        resourceType: ctx.str('resource_type'),
        resourceId: ctx.num('resource_id'),
      },
    },
  }),
  execute: async (ctx) => {
    const url = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), 'analysis');
    const result = await callMcpTool(
      url,
      'get_resource_url',
      {
        projectId: ctx.num('project_id'),
        resourceType: ctx.str('resource_type'),
        resourceId: ctx.num('resource_id'),
      },
      ctx.host(),
    );

    const parsed = parseMcpResult(result);
    if (typeof parsed !== 'object' || parsed === null) {
      return parsed;
    }

    normalizeResourceUrlFields(parsed, ctx.host());
    return parsed;
  },
};
