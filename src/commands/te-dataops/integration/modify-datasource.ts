import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_modify_datasource';

function optionalBool(ctx: RuntimeContext, name: string): boolean | undefined {
  const flagName = `--${name}`;
  const hasFlag = process.argv.some((arg) => arg === flagName || arg.startsWith(`${flagName}=`));
  if (!hasFlag) return undefined;
  const raw = ctx.str(name);
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    dataSourceName: ctx.str('dataSourceName'),
    dataSourceRemark: ctx.str('dataSourceRemark'),
    sharedConfig: optionalBool(ctx, 'sharedConfig'),
    envJsonList: ctx.str('envJsonList'),
  };
}

export const modifyDatasource: Command = {
  service: 'dataops_integration',
  command: '+modify_datasource',
  description: 'Modify datasource configuration. Requires spaceCode and dataSourceName. Optional fields dataSourceRemark, sharedConfig, and envJsonList update only the provided values. envJsonList uses the same JSON array format as +add_datasource. Changing connection parameters may affect running sync solutions.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'dataSourceName', type: 'string', required: true, desc: 'Datasource name' },
    { name: 'dataSourceRemark', type: 'string', required: false, desc: 'New remark (not passed means not modified)' },
    { name: 'sharedConfig', type: 'boolean', required: false, desc: 'Whether to share configuration (not passed means not modified)' },
    { name: 'envJsonList', type: 'string', required: false, desc: 'New environment config JSON array string (not passed means not modified)' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
