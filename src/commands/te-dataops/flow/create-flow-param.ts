import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { buildFlowParamScope, buildFlowParamWriteArgs, flowParamKeyFlag, flowParamScopeFlags, validateFlowParamKey } from './flow-param-options.js';

const toolName = 'flow_create_flow_param';

function buildArgs(ctx: RuntimeContext) {
  const scope = buildFlowParamScope(ctx);
  const paramKey = validateFlowParamKey(ctx.str('paramKey'));
  const fields = buildFlowParamWriteArgs(ctx);
  if (fields.paramValue === undefined) {
    throw new CliValidationError('--paramValue is required and must be a non-empty string');
  }
  return { ...scope, paramKey, ...fields, paramDataType: fields.paramDataType ?? 'VARCHAR' };
}

export const createFlowParam: Command = {
  service: 'dataops_flow',
  command: '+create_flow_param',
  description: 'Create one custom DEV workflow definition parameter. Text (VARCHAR) is the default; EXPRESSION uses existing expression validation. May stop running DEV debug executions; release the workflow to apply the new parameter to PROD.',
  flags: [
    ...flowParamScopeFlags,
    flowParamKeyFlag,
    { name: 'paramValue', type: 'string', required: true, desc: 'Non-empty parameter value, preserved literally without trimming or substitution' },
    { name: 'paramDataType', type: 'string', required: false, default: 'VARCHAR', desc: 'Parameter type: VARCHAR (text, default) or EXPRESSION' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional remark, up to 200 characters' },
  ],
  risk: 'write',
  validate: (ctx) => { buildArgs(ctx); },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
