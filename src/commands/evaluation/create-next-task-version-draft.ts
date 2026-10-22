import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/new-version`;
}

export const createNextTaskVersionDraft: Command = {
  service: 'evaluation',
  command: '+create_next_task_version_draft',
  description:
    'Create the next draft copy from the task version pinned by a run via POST /agenteval/api/v1/evaluation-runs/{id}/new-version. Sends no request body; returns the new draft run.',
  flags: [...evalFlags(), idFlag('Source run UUID')],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
