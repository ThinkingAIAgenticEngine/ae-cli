import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_list_flows';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    keyword: ctx.str('keyword'),
    pageNum: ctx.optionalNum('pageNum'),
    pageSize: ctx.optionalNum('pageSize'),
  };
}

export const listFlows: Command = {
  service: 'dataops_flow',
  command: '+list_flows',
  description: 'List task flows in a space. Requires spaceCode; keyword, pageNum, and pageSize are optional. Returns flows plus totalCount, returnedCount, pageNum, pageSize, and hasMore. Each flow includes basic metadata and latestProductionInstance when available. keyword matches flowName by contains and remark as a comma-delimited token. pageNum defaults to 1; pageSize defaults to 20 and maxes at 100.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'keyword', type: 'string', required: false, desc: 'Optional search keyword: flowName contains it; remark matches it as a comma-delimited token' },
    { name: 'pageNum', type: 'number', required: false, desc: 'Optional page number; default 1' },
    { name: 'pageSize', type: 'number', required: false, desc: 'Optional page size; default 20, max 100' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
