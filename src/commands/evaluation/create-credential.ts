import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/credentials';

const CREDENTIAL_TYPES = ['BEARER_TOKEN', 'API_KEY_HEADER', 'AI_MONITOR_SESSION'] as const;

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const type = ctx.str('type');
  if (!CREDENTIAL_TYPES.includes(type as (typeof CREDENTIAL_TYPES)[number])) {
    throw new Error('--type must be one of BEARER_TOKEN | API_KEY_HEADER | AI_MONITOR_SESSION');
  }
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    type,
    secret: ctx.str('secret'),
  };
  const header = ctx.str('header-name');
  if (header) body.header_name = header;
  const dataToken = ctx.str('data-token');
  const reportSource = ctx.str('report-source');
  if (type === 'AI_MONITOR_SESSION') {
    if (!dataToken || !reportSource) {
      throw new Error('--data-token and --report-source are required for AI_MONITOR_SESSION credentials');
    }
    body.data_token = dataToken;
    body.report_source = reportSource;
  } else if (dataToken || reportSource) {
    throw new Error('--data-token / --report-source are only supported for AI_MONITOR_SESSION credentials');
  }
  return body;
}

function redactedDryRunBody(ctx: RuntimeContext): Record<string, unknown> {
  const body = buildBody(ctx);
  const redacted: Record<string, unknown> = { ...body };
  if (typeof redacted.secret === 'string' && redacted.secret) redacted.secret = '***redacted***';
  if (typeof redacted.data_token === 'string' && redacted.data_token) redacted.data_token = '***redacted***';
  if (typeof redacted.report_source === 'string' && redacted.report_source) redacted.report_source = '***redacted***';
  return redacted;
}

export const createCredential: Command = {
  service: 'evaluation',
  command: '+create_credential',
  description:
    'Create a credential via POST /agenteval/api/v1/credentials. The secret is stored server-side and never echoed back; reference the credential by UUID when creating model configs, agents, or AI Monitor connections. Requires ADMIN role.',
  flags: [
    ...evalFlags(),
    { name: 'name', type: 'string', required: true, desc: 'Credential name (1-128 characters)' },
    {
      name: 'type',
      type: 'string',
      required: true,
      desc: 'Credential type: BEARER_TOKEN | API_KEY_HEADER | AI_MONITOR_SESSION',
    },
    {
      name: 'secret',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'Secret value (max 8192 chars); sent once to the current AE Host and never returned by the platform',
    },
    { name: 'header-name', type: 'string', desc: 'Header name for API_KEY_HEADER credentials (max 64 chars)' },
    {
      name: 'data-token',
      type: 'string',
      sensitive: true,
      desc: 'AI Monitor data token (max 512 chars); required for AI_MONITOR_SESSION credentials',
    },
    {
      name: 'report-source',
      type: 'string',
      sensitive: true,
      desc: 'AI Monitor report source (max 128 chars); required for AI_MONITOR_SESSION credentials',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, redactedDryRunBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
