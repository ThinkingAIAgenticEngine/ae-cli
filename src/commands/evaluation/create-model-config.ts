import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/model-configs';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    provider: ctx.str('provider'),
    model_name: ctx.str('model-name'),
    base_url: ctx.str('base-url'),
  };
  const parameters = ctx.json('parameters-json');
  if (parameters !== undefined) body.parameters = parameters;
  const capabilities = ctx.json('capabilities-json');
  if (capabilities !== undefined) body.capabilities = capabilities;
  const credentialId = ctx.str('credential-id');
  if (credentialId) body.credential_id = credentialId;
  return body;
}

export const createModelConfig: Command = {
  service: 'evaluation',
  command: '+create_model_config',
  description:
    'Create an LLM model configuration via POST /agenteval/api/v1/model-configs. Capabilities must set chat_completions=true and max_context_tokens>=1. Validate reachability with +test_model_config_connectivity before use. Creates a personal resource; sharing and administrative operations use separate permission checks.',
  flags: [
    ...evalFlags(),
    { name: 'name', type: 'string', required: true, desc: 'Model config name (1-128 characters)' },
    {
      name: 'provider',
      type: 'string',
      required: true,
      desc: 'Provider protocol: OPENAI_COMPATIBLE_CHAT | ANTHROPIC_CHAT | GEMINI_CHAT | AZURE_OPENAI_CHAT | TE_CLAUDE_WEB',
    },
    { name: 'model-name', type: 'string', required: true, desc: 'Model name sent to the provider (1-128 characters)' },
    { name: 'base-url', type: 'string', required: true, desc: 'Provider base URL; /v1 is appended automatically per provider convention' },
    {
      name: 'parameters-json',
      type: 'json',
      desc: 'ModelParameters JSON (MODEL_PARAMETERS_V2: temperature/top_p/seed/timeout_ms/max_retries/structured_output); output limits are delegated to the provider',
    },
    {
      name: 'capabilities-json',
      type: 'json',
      desc: 'ModelCapabilities JSON (schema_version/chat_completions/json_schema/seed/usage/max_context_tokens), MODEL_CAPABILITIES_V1',
    },
    {
      name: 'credential-id',
      type: 'string',
      desc: 'Credential UUID from +list_credentials; TE_CLAUDE_WEB under TE authentication binds the login credential automatically',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
