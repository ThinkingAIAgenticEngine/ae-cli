import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/agents/te-claude/catalog';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { endpoint_url: ctx.str('endpoint-url') };
  const credentialId = ctx.str('credential-id');
  if (credentialId) body.credential_id = credentialId;
  return body;
}

export const listTeClaudeCatalog: Command = {
  service: 'evaluation',
  command: '+list_te_claude_catalog',
  description:
    'List TE Claude agents and models via POST /agenteval/api/v1/agents/te-claude/catalog. TE sessions use the login access token automatically; non-TE authentication may provide a legacy credential. Use the returned ids when creating TE_CLAUDE_WEB model configs and agent configs.',
  flags: [
    ...evalFlags(),
    { name: 'endpoint-url', type: 'string', required: true, desc: 'TE Claude endpoint URL (absolute URI)' },
    {
      name: 'credential-id',
      type: 'string',
      desc: 'Optional legacy credential UUID for non-TE authentication; TE sessions use the login access token automatically',
    },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
