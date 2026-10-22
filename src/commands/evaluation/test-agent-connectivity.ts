import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/agents';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/test-connectivity`;
}

export const testAgentConnectivity: Command = {
  service: 'evaluation',
  command: '+test_agent_connectivity',
  description:
    'Run a compatibility preflight against an agent via POST /agenteval/api/v1/agents/{id}/test-connectivity: connection, authentication, and protocol version. Fix any reported issue before starting runs.',
  flags: [...evalFlags(), idFlag('Agent UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
