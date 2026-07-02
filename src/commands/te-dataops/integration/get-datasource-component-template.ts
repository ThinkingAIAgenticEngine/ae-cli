import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_get_datasource_component_template';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    componentName: ctx.str('componentName'),
  };
}

export const getDatasourceComponentTemplate: Command = {
  service: 'dataops_integration',
  command: '+get_datasource_component_template',
  description: 'Get the envJsonList template for one datasource component. Requires componentName. Returns component metadata, requiredFields, optionalFields, envJsonExampleObject, and importantNotes.',
  flags: [
    { name: 'componentName', type: 'string', required: true, desc: 'Exact componentName returned by +list_datasource_components, e.g. MySQL, ClickHouse, DatabricksJdbc, LarkBitable, OSS, S3, HDFS' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
