import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/agents';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/snapshot-preview`;
}

export const agentSnapshotPreview: Command = {
  service: 'evaluation',
  command: '+agent_snapshot_preview',
  description:
    'Preview the immutable agent snapshot a run would freeze at start via GET /agenteval/api/v1/agents/{id}/snapshot-preview. Use to verify what a run template actually captured.',
  flags: [...evalFlags(), idFlag('Agent UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
