import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

function normalizeResourceUrlFields(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      normalizeResourceUrlFields(value);
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

    normalizeResourceUrlFields(parsed);
    return parsed;
  },
};
