import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/agents';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getAgent: Command = {
  service: 'evaluation',
  command: '+get_agent',
  description:
    'Get one agent configuration by id via GET /agenteval/api/v1/agents/{agentId}.',
  flags: [...evalFlags(), idFlag('Agent UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
