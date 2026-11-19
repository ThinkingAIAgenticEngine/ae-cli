import type { Command } from "../../../framework/types.js";
import { teamScopeCommand } from "./scope-command.js";

export const copyTeam: Command = {
  command: "+copy-to-personal",
  ...teamScopeCommand("copy"),
};
