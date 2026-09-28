import type { Command } from '../../../framework/types.js';
import { projectReceiveStatusUpdate } from './update.js';

const commands: Command[] = [
  projectReceiveStatusUpdate,
];

export default commands;
