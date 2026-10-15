import type { Command } from '../../../framework/types.js';
import { dashboardReportAdd } from './add.js';
import { dashboardReportGet } from './get.js';
import { dashboardReportUpdate } from './update.js';

const commands: Command[] = [
  dashboardReportAdd,
  dashboardReportGet,
  dashboardReportUpdate,
];

export default commands;
export { dashboardReportAdd };
export { dashboardReportGet };
export { dashboardReportUpdate };
