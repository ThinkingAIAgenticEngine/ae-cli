import type { Command } from '../../framework/types.js';
import project from './project/index.js';

const commands: Command[] = [
  ...project,
];

export default commands;
