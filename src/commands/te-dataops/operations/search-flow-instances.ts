import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'operations_search_flow_instances';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    keyword: ctx.str('keyword'),
    startDate: ctx.str('startDate'),
    endDate: ctx.str('endDate'),
    status: ctx.str('status'),
    pageNum: ctx.optionalNum('pageNum'),
    pageSize: ctx.optionalNum('pageSize'),
  };
}

export const searchFlowInstances: Command = {
  service: 'dataops_operations',
  command: '+search_flow_instances',
  description: 'Search workflow instances from the operations perspective. Requires spaceCode; keyword, startDate, endDate, status, pageNum, and pageSize are optional. Returns totalCount, returnedCount, pageNum, pageSize, hasMore, instances, statusCounts, triggerTypeCounts, and ownerCounts. Use flowInstanceId for operations inspection; do not confuse it with executeId.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'keyword', type: 'string', required: false, desc: 'Optional keyword; fuzzy matches instance ID, workflow name, and workflow remark' },
    { name: 'startDate', type: 'string', required: false, desc: 'Optional execution start date, yyyy-MM-dd' },
    { name: 'endDate', type: 'string', required: false, desc: 'Optional execution end date, yyyy-MM-dd' },
    { name: 'status', type: 'string', required: false, desc: 'Optional comma-separated statuses: WAITING,RUNNING,SUCCESS,FAIL,READY_PAUSE,PAUSE,STOP' },
    { name: 'pageNum', type: 'number', required: false, desc: 'Optional page number; default 1' },
    { name: 'pageSize', type: 'number', required: false, desc: 'Optional page size; default 20, max 100' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
