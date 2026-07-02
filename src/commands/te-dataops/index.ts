import type { Command } from "../../framework/types.js";

// Import all category commands
import datatableCommands from "./datatable/index.js";
import flowCommands from "./flow/index.js";
import integrationCommands from "./integration/index.js";
import operationsCommands from "./operations/index.js";
import repoCommands from "./repo/index.js";
import ideCommands from "./ide/index.js";

const commands: Command[] = [
  ...datatableCommands,
  ...flowCommands,
  ...integrationCommands,
  ...operationsCommands,
  ...repoCommands,
  ...ideCommands,
];

export default commands;
