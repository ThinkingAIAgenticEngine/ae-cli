import type { Command } from '../../../framework/types.js';
import { queryClusterList } from './list.js';

const commands: Command[] = [queryClusterList];

export default commands;
export { queryClusterList };
