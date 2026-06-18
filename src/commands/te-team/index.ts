import type { Command } from '../../framework/types.js';
import teamCommands from './team/index.js';
import runCommands from './run/index.js';

const commands: Command[] = [
  ...teamCommands,
  ...runCommands,
];

export default commands;
