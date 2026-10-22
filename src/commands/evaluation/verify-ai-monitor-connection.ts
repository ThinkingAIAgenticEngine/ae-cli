import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/ai-monitor-connection/verify';

export const verifyAiMonitorConnection: Command = {
  service: 'evaluation',
  command: '+verify_ai_monitor_connection',
  description:
    'Verify the saved AI Monitor connection by reaching the upstream via POST /agenteval/api/v1/ai-monitor-connection/verify. Sends no request body; returns the upstream trace total.',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH),
};
