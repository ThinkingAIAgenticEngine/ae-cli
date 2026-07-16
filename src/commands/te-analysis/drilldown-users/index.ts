import type { Command } from '../../../framework/types.js';
import { drilldownUsersExport } from './export.js';
import { drilldownUsersRun } from './run.js';

const commands: Command[] = [drilldownUsersRun, drilldownUsersExport];

export default commands;
export { drilldownUsersRun, drilldownUsersExport };
