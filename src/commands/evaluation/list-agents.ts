import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/agents';

export const listAgents: Command = {
  service: 'evaluation',
  command: '+list_agents',
  description:
    'List agents under test via GET /agenteval/api/v1/agents. Returns all configured agent connectors.',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH),
};
