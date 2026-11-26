import type { Command } from '../../framework/types.js';
import { currentPageContext } from './current.js';
import { contextPrepare } from './prepare.js';

const commands: Command[] = [currentPageContext, contextPrepare];

export { currentPageContext } from './current.js';
export { contextPrepare } from './prepare.js';
export default commands;
