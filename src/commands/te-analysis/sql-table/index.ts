import type { Command } from '../../../framework/types.js';
import { sqlTableColumns } from './columns.js';
import { sqlTableList } from './list.js';

const commands: Command[] = [sqlTableList, sqlTableColumns];

export default commands;
export { sqlTableColumns, sqlTableList };
