import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

function toAbsoluteUrl(host: string, candidate: string): string {
  if (!candidate) return candidate;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  const normalizedBase = host.replace(/\/+$/, '');
  if (candidate.startsWith('/')) {
    return `${normalizedBase}${candidate}`;
  }
  if (candidate.startsWith('#')) {
    return `${normalizedBase}/${candidate}`;
  }
  return `${normalizedBase}/${candidate}`;
}

function patchMarkdownLink(link: string, absoluteUrl: string): string {
  // Typical format: [text](url)
  return link.replace(/\]\(([^)]+)\)$/, `](${absoluteUrl})`);
}

function normalizeResourceUrlFields(node: unknown, host: string): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  const rawUrl =
    (typeof obj.raw_url === 'string' && obj.raw_url) ||
    (typeof obj.rawUrl === 'string' && obj.rawUrl) ||
    '';

  if (rawUrl) {
    const absoluteUrl = toAbsoluteUrl(host, rawUrl);
    if (obj.raw_url !== undefined) obj.raw_url = absoluteUrl;
    if (obj.rawUrl !== undefined) obj.rawUrl = absoluteUrl;
    if (typeof obj.markdown_link === 'string') {
      obj.markdown_link = patchMarkdownLink(obj.markdown_link, absoluteUrl);
    }
    if (typeof obj.markdownLink === 'string') {
      obj.markdownLink = patchMarkdownLink(obj.markdownLink, absoluteUrl);
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      normalizeResourceUrlFields(value, host);
    }
  }
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
