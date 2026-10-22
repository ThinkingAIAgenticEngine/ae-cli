import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/agents';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteAgent: Command = {
  service: 'evaluation',
  command: '+delete_agent',
  description:
    'Delete an agent under test via DELETE /agenteval/api/v1/agents/{id}. Runs referencing the agent keep their frozen snapshot. Requires the current agent lock_version.',
  flags: [...evalFlags(), ...idAndLockFlags('Agent UUID', 'agent')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
