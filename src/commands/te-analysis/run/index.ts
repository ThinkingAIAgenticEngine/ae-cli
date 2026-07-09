import type { Command } from '../../../framework/types.js';
import { runInspect } from './inspect.js';

const commands: Command[] = [
  runInspect,
];

export default commands;
export { runInspect };
