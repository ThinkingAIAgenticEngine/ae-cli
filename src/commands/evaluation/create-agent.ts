import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/agents';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    endpoint_url: ctx.str('endpoint-url'),
    input_schema: ctx.json('input-schema-json'),
    config: ctx.json('config-json'),
  };
  const connectorType = ctx.str('connector-type');
  if (connectorType) body.connector_type = connectorType;
  const credentialId = ctx.str('credential-id');
  if (credentialId) body.credential_id = credentialId;
  return body;
}

function validateBody(body: Record<string, unknown>): void {
  if (typeof body.input_schema !== 'object' || body.input_schema === null) {
    throw new Error('--input-schema-json is required (AGENT_INPUT_SCHEMA_V1 object with type/properties/required)');
  }
  if (typeof body.config !== 'object' || body.config === null) {
    throw new Error('--config-json is required (AGENT_CONFIG_V* object matching the connector type)');
  }
}

export const createAgent: Command = {
  service: 'evaluation',
  command: '+create_agent',
  description:
    'Create an agent under test via POST /agenteval/api/v1/agents. Validate reachability with +test_agent_connectivity before binding the agent to runs. Creates a personal resource; sharing and administrative operations use separate permission checks.',
  flags: [
    ...evalFlags(),
    { name: 'name', type: 'string', required: true, desc: 'Agent config name (1-128 characters)' },
    {
      name: 'connector-type',
      type: 'string',
      desc: 'Connector protocol: HTTP_JSON_V1 | OPENCODE_SERVER | OPENCLAW_GATEWAY_V1 | HERMES_RUNS_V1 | TE_CLAUDE_WEB_V1',
    },
    { name: 'endpoint-url', type: 'string', required: true, desc: 'Agent endpoint URL (max 1000 characters)' },
    {
      name: 'input-schema-json',
      type: 'json',
      required: true,
      desc: 'AgentInputSchema JSON (AGENT_INPUT_SCHEMA_V1): {"type":"object","properties":{...},"required":[...]}',
    },
    {
      name: 'config-json',
      type: 'json',
      required: true,
      desc: 'AgentConfig JSON (AGENT_CONFIG_V*) matching the connector type; see an existing agent via +get_agent for a template',
    },
    {
      name: 'credential-id',
      type: 'string',
      desc: 'Credential UUID from +list_credentials; TE_CLAUDE_WEB_V1 under TE authentication binds the login credential automatically',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => {
    const body = buildBody(ctx);
    validateBody(body);
    return evalDryRun(ctx, 'POST', PATH, undefined, body);
  },
  execute: async (ctx) => {
    const body = buildBody(ctx);
    validateBody(body);
    return evalApi(ctx, 'POST', PATH, undefined, body);
  },
};
