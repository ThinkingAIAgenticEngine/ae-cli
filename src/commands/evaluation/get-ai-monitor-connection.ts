import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/ai-monitor-connection';

export const getAiMonitorConnection: Command = {
  service: 'evaluation',
  command: '+get_ai_monitor_connection',
  description:
    'Get the project AI Monitor connection via GET /agenteval/api/v1/ai-monitor-connection. Connection is null when unset. Read its lock_version before +save_ai_monitor_connection.',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH),
};
