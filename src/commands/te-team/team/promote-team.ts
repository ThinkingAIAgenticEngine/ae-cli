import type { Command } from "../../../framework/types.js";
import { teamScopeCommand } from "./scope-command.js";

export const promoteTeam: Command = {
  command: "+promote",
  ...teamScopeCommand("promote"),
};
