import { buildCapabilityGatewayUrl, callCapabilityApi } from '../../core/capability-api.js';
import { CliValidationError } from '../../core/errors.js';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveApprovalApiBaseUrl } from './approval-cli-client.js';

function contextPath(ctx: RuntimeContext): string {
  const query = ctx.bool('includeMcpCredentials') ? '?include_mcp_credentials=true' : '';
  return `agents/${encodeURIComponent(ctx.str('id'))}/context${query}`;
}

export const getAgentContext: Command = {
  service: 'agent',
  command: '+get-agent-context',
  description: 'Get Agent instructions and dependency discovery for local client execution',
  helpText: 'Returns metadata by default. --include-mcp-credentials explicitly exports portable MCP connection credentials for the current user. Keep the result in local client configuration; do not echo it in chat or logs. Does not install dependencies or run the Agent. Dry-run only previews the request.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Agent ID from agent +list-agents' },
    { name: 'include-mcp-credentials', type: 'boolean', desc: 'Include portable MCP connections and current-user credentials (sensitive output)' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const id = ctx.str('id');
    if (!id || id !== id.trim() || id.length > 191) {
      throw new CliValidationError('--id must be a non-empty identifier of at most 191 characters');
    }
  },
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(resolveApprovalApiBaseUrl(ctx.host()), 'agent', contextPath(ctx)),
  }),
  execute: (ctx) => callCapabilityApi(ctx.host(), 'agent', contextPath(ctx), 'GET', undefined, {
    apiBaseUrl: resolveApprovalApiBaseUrl(ctx.host()),
    retryOnInvalidTokenForbidden: false,
  }),
};
