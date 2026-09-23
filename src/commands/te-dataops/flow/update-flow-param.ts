import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { buildFlowParamScope, buildFlowParamWriteArgs, flowParamKeyFlag, flowParamScopeFlags, validateFlowParamKey } from './flow-param-options.js';

const toolName = 'flow_update_flow_param';

function buildArgs(ctx: RuntimeContext) {
  const scope = buildFlowParamScope(ctx);
  const paramKey = validateFlowParamKey(ctx.str('paramKey'));
  const originParamKey = ctx.list('originParamKey')[0];
  if (originParamKey !== undefined) validateFlowParamKey(originParamKey, 'originParamKey');
  const fields = buildFlowParamWriteArgs(ctx);
  if (Object.values(fields).every((value) => value === undefined)
    && (originParamKey === undefined || originParamKey === paramKey)) {
    throw new CliValidationError('Pass at least one of --paramValue, --paramDataType, --remark, or rename with --originParamKey');
  }
  return { ...scope, paramKey, originParamKey, ...fields };
}

export const updateFlowParam: Command = {
  service: 'dataops_flow',
  command: '+update_flow_param',
  description: 'Update or rename one custom DEV workflow definition parameter. Omitted fields keep their values; an empty remark clears it. Value/type/name changes may stop DEV debug executions and require release for PROD. A remark update without renaming also updates an existing PROD parameter remark. Renaming does not replace old references in SQL.',
  flags: [
    ...flowParamScopeFlags,
    flowParamKeyFlag,
    { name: 'originParamKey', type: 'string', required: false, desc: 'Existing parameter name when renaming; omit to update paramKey in place' },
    { name: 'paramValue', type: 'string', required: false, desc: 'New non-empty value, preserved literally; omit to keep the current value' },
    { name: 'paramDataType', type: 'string', required: false, desc: 'VARCHAR (text) or EXPRESSION; omit to keep the current type' },
    { name: 'remark', type: 'string', required: false, desc: 'New remark, up to 200 characters; omit to keep it, or pass an empty string to clear it' },
  ],
  risk: 'write',
  validate: (ctx) => { buildArgs(ctx); },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
