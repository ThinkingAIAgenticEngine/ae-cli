import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const addDatasource: Command = {
  service: 'dataops_integration',
  command: '+add_datasource',
  description: 'Create a datasource. Write operation requires two-step confirmation: First call returns operation preview (including envJsonExampleObject parameter format example and importantNotes for the component), after confirmation set confirmed=true to execute creation. Before creation, must call integration_list_datasource_components to get requiredFields and envJsonExampleObject. JSON key in envJsonList must be exactly the same as key in requiredFields, abbreviations or aliases are not allowed (refer to doNotUseNames for incorrect names). envJsonList format: JSON array string, each element contains connection parameters required by the component (refer to envJsonExampleObject). When sharedConfig=true, envJsonList only needs 1 element (tool will automatically copy to DEV and PROD); When sharedConfig=false, need to pass 2 elements, first is DEV environment config, second is PROD environment config',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'componentName', type: 'string', required: true, desc: 'Component name, must be exactly the same as componentName returned by integration_list_datasource_components (e.g. MySQL, ClickHouse, OSS, LarkBitable, etc.)' },
    { name: 'dataSourceName', type: 'string', required: true, desc: 'Datasource name (1-80 characters)' },
    { name: 'dataSourceRemark', type: 'string', required: false, desc: 'Datasource remark (max 200 characters)' },
    { name: 'sharedConfig', type: 'boolean', required: true, desc: 'Whether to share configuration across environments: true=all environments share the same connection config (envJsonList only needs 1 element) / false=each environment has independent config (envJsonList needs 2 elements)' },
    { name: 'envJsonList', type: 'string', required: true, desc: 'Environment config JSON array string. JSON key must be exactly the same as requiredFields key, format refers to envJsonExampleObject returned by integration_list_datasource_components' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Whether confirmed to execute, defaults to false if not passed' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_add_datasource', {
      spaceCode: ctx.str('spaceCode'),
      componentName: ctx.str('componentName'),
      dataSourceName: ctx.str('dataSourceName'),
      dataSourceRemark: ctx.str('dataSourceRemark'),
      sharedConfig: ctx.bool('sharedConfig'),
      envJsonList: ctx.str('envJsonList'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};