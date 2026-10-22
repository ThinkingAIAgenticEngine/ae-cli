import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/model-configs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    provider: ctx.str('provider'),
    model_name: ctx.str('model-name'),
    base_url: ctx.str('base-url'),
    lock_version: ctx.num('lock-version'),
  };
  const parameters = ctx.json('parameters-json');
  if (parameters !== undefined) body.parameters = parameters;
  const capabilities = ctx.json('capabilities-json');
  if (capabilities !== undefined) body.capabilities = capabilities;
  const credentialId = ctx.str('credential-id');
  if (credentialId) body.credential_id = credentialId;
  return body;
}

export const updateModelConfig: Command = {
  service: 'evaluation',
  command: '+update_model_config',
  description:
    'Update a model configuration via PATCH /agenteval/api/v1/model-configs/{id}. Full-replace semantics: pass every field, not only the ones changing (e.g. raise timeout_ms inside --parameters-json). Requires the current lock_version from +get_model_config.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Model config UUID', 'model config'),
    { name: 'name', type: 'string', required: true, desc: 'Model config name (1-128 characters)' },
    {
      name: 'provider',
      type: 'string',
      required: true,
      desc: 'Provider protocol: OPENAI_COMPATIBLE_CHAT | ANTHROPIC_CHAT | GEMINI_CHAT | AZURE_OPENAI_CHAT | TE_CLAUDE_WEB',
    },
    { name: 'model-name', type: 'string', required: true, desc: 'Model name sent to the provider' },
    { name: 'base-url', type: 'string', required: true, desc: 'Provider base URL' },
    {
      name: 'parameters-json',
      type: 'json',
      desc: 'ModelParameters JSON (MODEL_PARAMETERS_V2), e.g. temperature/top_p/seed/timeout_ms/max_retries; output limits are provider-controlled',
    },
    {
      name: 'capabilities-json',
      type: 'json',
      desc: 'ModelCapabilities JSON (MODEL_CAPABILITIES_V1); chat_completions=true and max_context_tokens>=1 are required',
    },
    {
      name: 'credential-id',
      type: 'string',
      desc: 'Credential UUID used to authenticate to the provider; TE_CLAUDE_WEB under TE authentication binds the login credential automatically',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
