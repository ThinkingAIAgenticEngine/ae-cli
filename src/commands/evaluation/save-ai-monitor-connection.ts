import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/ai-monitor-connection';

const REQUIRED_CLAIM_KEYS = ['user_id', 'te_user_id', 'name', 'company_id'] as const;

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const claims = ctx.json('session-claims-json');
  if (
    claims === null ||
    typeof claims !== 'object' ||
    Array.isArray(claims) ||
    !REQUIRED_CLAIM_KEYS.every((key) => typeof (claims as Record<string, unknown>)[key] === 'string')
  ) {
    throw new Error(
      '--session-claims-json must be a JSON object with string user_id, te_user_id, name and company_id (is_root/platform_access optional)',
    );
  }
  const body: Record<string, unknown> = {
    base_url: ctx.str('base-url'),
    credential_id: ctx.str('credential-id'),
    session_claims: claims,
  };
  const lockVersion = ctx.optionalNum('lock-version');
  if (lockVersion !== undefined) body.lock_version = lockVersion;
  return body;
}

function redactedDryRunBody(ctx: RuntimeContext): Record<string, unknown> {
  const body = buildBody(ctx);
  if (body.session_claims !== undefined) body.session_claims = '***redacted***';
  return body;
}

export const saveAiMonitorConnection: Command = {
  service: 'evaluation',
  command: '+save_ai_monitor_connection',
  description:
    'Create or update the project AI Monitor connection via PUT /agenteval/api/v1/ai-monitor-connection. The credential must be of type AI_MONITOR_SESSION. Omit --lock-version on first create; on update pass the current lock_version from +get_ai_monitor_connection (0 is a valid version).',
  flags: [
    ...evalFlags(),
    { name: 'base-url', type: 'string', required: true, desc: 'AI Monitor base URL (absolute URI, max 1000 chars)' },
    {
      name: 'credential-id',
      type: 'string',
      required: true,
      desc: 'Credential UUID of type AI_MONITOR_SESSION (from +list_credentials)',
    },
    {
      name: 'session-claims-json',
      type: 'json',
      required: true,
      sensitive: true,
      desc: 'Session claims JSON with required string keys user_id, te_user_id, name, company_id (optional is_root, platform_access)',
    },
    {
      name: 'lock-version',
      type: 'number',
      min: 0,
      desc: 'Current connection lock_version when updating an existing connection (from +get_ai_monitor_connection); omit on first create',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PUT', PATH, undefined, redactedDryRunBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PUT', PATH, undefined, buildBody(ctx)),
};
