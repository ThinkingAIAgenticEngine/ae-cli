import type { Command } from '../../../framework/types.js';
import { biPanelPageDataRun } from './run.js';
import { biPanelPageDataExport } from './export.js';

const commands: Command[] = [
  biPanelPageDataRun,
  biPanelPageDataExport,
];

export default commands;
export { biPanelPageDataRun };
export { biPanelPageDataExport };
