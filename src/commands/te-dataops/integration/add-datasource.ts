import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_add_datasource';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    componentName: ctx.str('componentName'),
    dataSourceName: ctx.str('dataSourceName'),
    dataSourceRemark: ctx.str('dataSourceRemark'),
    sharedConfig: ctx.bool('sharedConfig'),
    envJsonList: ctx.str('envJsonList'),
  };
}

export const addDatasource: Command = {
  service: 'dataops_integration',
  command: '+add_datasource',
  description: 'Create a datasource. Required: spaceCode, componentName, dataSourceName, sharedConfig, envJsonList. Optional: dataSourceRemark. envJsonList is a JSON array string whose keys must match requiredFields from +get_datasource_component_template; sharedConfig=true uses one config for DEV/PROD, sharedConfig=false requires two configs (DEV, PROD).',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'componentName', type: 'string', required: true, desc: 'Datasource component name from +list_datasource_components, e.g. MySQL or ClickHouse' },
    { name: 'dataSourceName', type: 'string', required: true, desc: 'Datasource name (1-80 characters)' },
    { name: 'dataSourceRemark', type: 'string', required: false, desc: 'Datasource remark (max 200 characters)' },
    { name: 'sharedConfig', type: 'boolean', required: true, desc: 'true: one envJsonList item is copied to DEV/PROD; false: provide two items (DEV, PROD)' },
    { name: 'envJsonList', type: 'string', required: true, desc: 'JSON array string of component connection fields. Keys must match requiredFields from +get_datasource_component_template' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
