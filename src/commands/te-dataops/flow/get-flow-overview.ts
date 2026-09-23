import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_get_flow_overview';

function requireFlowTarget(ctx: RuntimeContext): void {
  if (ctx.optionalNum('flowCode') == null && !ctx.str('flowName').trim()) {
    throw new Error('Pass --flowCode or --flowName');
  }
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  requireFlowTarget(ctx);
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.optionalNum('flowCode'),
    flowName: ctx.str('flowName'),
    env: ctx.str('env'),
  };
}

export const getFlowOverview: Command = {
  service: 'dataops_flow',
  command: '+get_flow_overview',
  description: 'Get a DEV/PROD flow overview; env defaults to DEV. Requires dwWorkflowEdit, spaceCode, and either flowCode or exact flowName; flowCode wins. Returns success, env, resolvedBy, flow, flowParams, schedule, dag, and summary. flowParams contains all custom flow definitions; dag.tasks[].taskParams contains task references with source, value, type, and built-in flags in the selected environment. Definition values preserve expression text. paramFrom is FLOW or SPACE for configured sources. Code-parsed parameters without a configured source stay in the list with null or omitted paramFrom and paramValue fields. Empty parameter lists are arrays. PROD may include latest instance fields.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: false, desc: 'Optional task flow code; takes precedence over flowName' },
    { name: 'flowName', type: 'string', required: false, desc: 'Optional exact task flow name; required when flowCode is omitted' },
    { name: 'env', type: 'string', required: false, desc: 'Optional environment: DEV (default) or PROD' },
  ],
  risk: 'read',
  validate: requireFlowTarget,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
