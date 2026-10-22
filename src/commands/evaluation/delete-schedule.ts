import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-run-schedules';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteSchedule: Command = {
  service: 'evaluation',
  command: '+delete_schedule',
  description:
    'Delete a scheduled evaluation in any status via DELETE /agenteval/api/v1/evaluation-run-schedules/{id}. An occurrence already claimed by a worker may finish, but no future occurrence is created. Requires the current lock_version from +list_schedules.',
  flags: [
    ...evalFlags(),
    idFlag('Schedule UUID'),
    {
      name: 'lock-version',
      type: 'number',
      required: true,
      min: 0,
      desc: 'Current schedule lock_version (optimistic lock), from +list_schedules',
    },
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
