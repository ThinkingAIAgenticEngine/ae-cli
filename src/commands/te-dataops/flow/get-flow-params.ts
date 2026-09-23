import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { buildFlowParamScope, flowParamScopeFlags } from './flow-param-options.js';

const toolName = 'flow_get_flow_params';

function buildArgs(ctx: RuntimeContext) {
  const scope = buildFlowParamScope(ctx);
  const env = ctx.list('env')[0] ?? 'DEV';
  if (env !== 'DEV' && env !== 'PROD') {
    throw new CliValidationError('--env must be DEV or PROD');
  }
  return { ...scope, env };
}

export const getFlowParams: Command = {
  service: 'dataops_flow',
  command: '+get_flow_params',
  description: 'List custom workflow definition parameters in DEV (default) or PROD. Returns an array with paramKey, paramValue, paramDataType, remark, paramFormat, and expression reference metadata. Requires workflow edit permission.',
  flags: [
    ...flowParamScopeFlags,
    { name: 'env', type: 'string', required: false, default: 'DEV', desc: 'Definition environment: DEV or PROD. Default DEV' },
  ],
  risk: 'read',
  validate: (ctx) => { buildArgs(ctx); },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
