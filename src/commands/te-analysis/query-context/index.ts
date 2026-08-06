import type { Command } from '../../../framework/types.js';
import { queryContextGet } from './get.js';

const commands: Command[] = [queryContextGet];

export default commands;
export { queryContextGet };
