import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/agents';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    endpoint_url: ctx.str('endpoint-url'),
    input_schema: ctx.json('input-schema-json'),
    config: ctx.json('config-json'),
    lock_version: ctx.num('lock-version'),
  };
  const connectorType = ctx.str('connector-type');
  if (connectorType) body.connector_type = connectorType;
  const credentialId = ctx.str('credential-id');
  if (credentialId) body.credential_id = credentialId;
  return body;
}

function validateBody(body: Record<string, unknown>): void {
  if (typeof body.input_schema !== 'object' || body.input_schema === null) {
    throw new Error('--input-schema-json is required (AGENT_INPUT_SCHEMA_V1 object)');
  }
  if (typeof body.config !== 'object' || body.config === null) {
    throw new Error('--config-json is required (AGENT_CONFIG_V* object matching the connector type)');
  }
}

export const updateAgent: Command = {
  service: 'evaluation',
  command: '+update_agent',
  description:
    'Update an agent under test via PATCH /agenteval/api/v1/agents/{id}. Full-replace semantics: pass every field including unchanged ones. Requires the current agent lock_version from +get_agent.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Agent UUID', 'agent'),
    { name: 'name', type: 'string', required: true, desc: 'Agent config name (1-128 characters)' },
    {
      name: 'connector-type',
      type: 'string',
      desc: 'Connector protocol: HTTP_JSON_V1 | OPENCODE_SERVER | OPENCLAW_GATEWAY_V1 | HERMES_RUNS_V1 | TE_CLAUDE_WEB_V1',
    },
    { name: 'endpoint-url', type: 'string', required: true, desc: 'Agent endpoint URL (max 1000 characters)' },
    { name: 'input-schema-json', type: 'json', required: true, desc: 'AgentInputSchema JSON (AGENT_INPUT_SCHEMA_V1)' },
    { name: 'config-json', type: 'json', required: true, desc: 'AgentConfig JSON (AGENT_CONFIG_V*) matching the connector type' },
    {
      name: 'credential-id',
      type: 'string',
      desc: 'Credential UUID used to authenticate to the agent; TE_CLAUDE_WEB_V1 under TE authentication binds the login credential automatically',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => {
    const body = buildBody(ctx);
    validateBody(body);
    return evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, body);
  },
  execute: async (ctx) => {
    const body = buildBody(ctx);
    validateBody(body);
    return evalApi(ctx, 'PATCH', pathFor(ctx), undefined, body);
  },
};
