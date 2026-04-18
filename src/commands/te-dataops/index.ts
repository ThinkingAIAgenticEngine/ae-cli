import type { Command } from "../../framework/types.js";

// Import all category commands
import datatableCommands from "./datatable/index.js";
import flowCommands from "./flow/index.js";
import integrationCommands from "./integration/index.js";
import repoCommands from "./repo/index.js";
import ideCommands from "./ide/index.js";
import { registerMcpMappings } from "../../core/mcp.js";

// Register MCP service mappings
registerMcpMappings({
  dataops_datatable: { componentName: "dataops", mappingPath: "datatable" },
  dataops_flow: { componentName: "dataops", mappingPath: "flow" },
  dataops_integration: { componentName: "dataops", mappingPath: "integration" },
  dataops_repo: { componentName: "dataops", mappingPath: "repo" },
  dataops_ide: { componentName: "dataops", mappingPath: "ide" },
});

const commands: Command[] = [
  ...datatableCommands,
  ...flowCommands,
  ...integrationCommands,
  ...repoCommands,
  ...ideCommands,
];

export default commands;
