import type { Command } from '../../../framework/types.js';
import { drilldownEntitiesExport } from './export.js';
import { drilldownEntitiesRun } from './run.js';

const commands: Command[] = [drilldownEntitiesRun, drilldownEntitiesExport];

export default commands;
export { drilldownEntitiesRun, drilldownEntitiesExport };
