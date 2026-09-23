import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { buildFlowParamScope, flowParamKeyFlag, flowParamScopeFlags, validateFlowParamKey } from './flow-param-options.js';

const toolName = 'flow_delete_flow_param';

function buildArgs(ctx: RuntimeContext) {
  return { ...buildFlowParamScope(ctx), paramKey: validateFlowParamKey(ctx.str('paramKey')) };
}

export const deleteFlowParam: Command = {
  service: 'dataops_flow',
  command: '+delete_flow_param',
  description: 'Delete one custom DEV workflow definition parameter after confirmation. May stop running DEV debug executions. Task references fall back to a same-name space parameter when available, otherwise remain unresolved. Inspect affected SQL and release the workflow to apply deletion to PROD.',
  flags: [...flowParamScopeFlags, flowParamKeyFlag],
  risk: 'high-risk-write',
  validate: (ctx) => { buildArgs(ctx); },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
