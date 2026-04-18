import type { Command } from "../../../framework/types.js";
import {
  callMcpTool,
  parseMcpResult,
  resolveMcpUrl,
} from "../../../core/mcp.js";

export const listDatasourceComponents: Command = {
  service: "dataops_integration",
  command: "+list_datasource_components",
  description:
    "List all datasource component types supported by the platform and their connection configuration parameters. Returns: componentName (component name), componentType (type classification), description (description), requiredFields (required parameters, key is the exact field name, includes doNotUseNames listing common incorrect aliases), optionalFields (optional parameters), envJsonExampleObject (environment configuration JSON example object, can be used directly as template), importantNotes (component-level important notes, must be followed). Call this tool before creating a datasource, construct the envJsonList parameter required by integration_add_datasource based on the returned requiredFields and envJsonExampleObject. Note: JSON keys in envJsonList must exactly match the keys in requiredFields, cannot use aliases listed in doNotUseNames. Supported components include: MySQL, PostgreSQL, ClickHouse, StarRocks, SelectDB, HBase, MongoDB, Redis, LarkBitable, OSS, S3, HDFS",
  flags: [],
  risk: "read",
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());

    const result = await callMcpTool(
      mcpUrl,
      "integration_list_datasource_components",
      {},
    );
    return parseMcpResult(result);
  },
};
