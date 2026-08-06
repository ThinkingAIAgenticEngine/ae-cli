import type { Command } from '../../../framework/types.js';
import { runInspect } from './inspect.js';
import { runWait } from './wait.js';

const commands: Command[] = [
  runInspect,
  runWait,
];

export default commands;
export { runInspect, runWait };
