import type { Command } from '../../../framework/types.js';
import { drilldownEventsExport } from './export.js';
import { drilldownEventsRun } from './run.js';

const commands: Command[] = [drilldownEventsRun, drilldownEventsExport];

export default commands;
export { drilldownEventsRun, drilldownEventsExport };
