import type { Command } from "../../../framework/types.js";
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_list_datasource_components';

export const listDatasourceComponents: Command = {
  service: "dataops_integration",
  command: "+list_datasource_components",
  description:
    "List supported datasource components. Requires no arguments. Returns componentName, componentType, and description. Use +get_datasource_component_template before creating a datasource.",
  flags: [],
  risk: "read",
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, {}),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, {});
  },
};
