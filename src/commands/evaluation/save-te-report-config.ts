import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/te-report-config';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    base_url: ctx.str('base-url'),
    app_id: ctx.str('app-id'),
  };
  const lockVersion = ctx.optionalNum('lock-version');
  if (lockVersion !== undefined) body.lock_version = lockVersion;
  return body;
}

export const saveTeReportConfig: Command = {
  service: 'evaluation',
  command: '+save_te_report_config',
  description:
    'Create or update the project TE reporting config via PUT /agenteval/api/v1/te-report-config. Omit --lock-version on first create; on update pass the current lock_version from +get_te_report_config (0 is a valid version).',
  flags: [
    ...evalFlags(),
    { name: 'base-url', type: 'string', required: true, desc: 'ThinkingData base URL (absolute URI, max 1000 chars)' },
    { name: 'app-id', type: 'string', required: true, desc: 'ThinkingData app id (max 128 chars)' },
    {
      name: 'lock-version',
      type: 'number',
      min: 0,
      desc: 'Current config lock_version when updating an existing config (from +get_te_report_config); omit on first create',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PUT', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PUT', PATH, undefined, buildBody(ctx)),
};
