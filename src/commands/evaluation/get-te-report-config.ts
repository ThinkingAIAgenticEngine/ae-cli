import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/te-report-config';

export const getTeReportConfig: Command = {
  service: 'evaluation',
  command: '+get_te_report_config',
  description:
    'Get the project TE reporting config via GET /agenteval/api/v1/te-report-config. Config is null when unset; the response also carries the deployment default base URL. Read its lock_version before +save_te_report_config.',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH),
};
