import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_list_high_frequency_release_flows';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    days: ctx.optionalNum('days'),
    topN: ctx.optionalNum('topN'),
    minCount: ctx.optionalNum('minCount'),
    status: ctx.str('status'),
  };
}

export const listHighFrequencyReleaseFlows: Command = {
  service: 'dataops_flow',
  command: '+list_high_frequency_release_flows',
  description: 'List flows ranked by release count, not execution count. Requires spaceCode; days, topN, minCount, and status are optional. Defaults to days=30, topN=10, status=SUCCESS. Returns period, filters, flows, returnedCount, and nextAction.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'days', type: 'number', required: false, desc: 'Optional lookback days; default 30, max 365' },
    { name: 'topN', type: 'number', required: false, desc: 'Optional top N flows; default 10, max 100' },
    { name: 'minCount', type: 'number', required: false, desc: 'Optional minimum release count' },
    { name: 'status', type: 'string', required: false, desc: 'Optional release status: SUCCESS, FAIL, PART_SUCCESS, or ALL; default SUCCESS' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
