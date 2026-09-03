import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'operations_list_backfill_flows';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return { spaceCode: ctx.str('spaceCode') };
}

export const listBackfillFlows: Command = {
  service: 'dataops_operations',
  command: '+list_backfill_flows',
  description: 'List PROD task flows that can be used to create a backfill job. Returns each flow code, name, and backfill eligibility information such as canRun and hasSt.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
