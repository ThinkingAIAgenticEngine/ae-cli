import type { Command } from '../../../framework/types.js';
import { drilldownUserEventsExport } from './export.js';
import { drilldownUserEventsRun } from './run.js';

const commands: Command[] = [drilldownUserEventsRun, drilldownUserEventsExport];

export default commands;
export { drilldownUserEventsRun, drilldownUserEventsExport };
