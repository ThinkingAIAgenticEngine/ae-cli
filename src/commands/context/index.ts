import type { Command } from '../../framework/types.js';
import { currentPageContext } from './current.js';

const commands: Command[] = [currentPageContext];

export { currentPageContext } from './current.js';
export default commands;
