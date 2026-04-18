import type { Command } from '../../framework/types.js';
import project from './project/index.js';
import resource from './resource/index.js';

const commands: Command[] = [
  ...project,
  ...resource,
];

export default commands;
