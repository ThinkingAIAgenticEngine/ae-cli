import type { Command } from '../../../framework/types.js';
import { dashboardReportDataRun } from './run.js';
import { dashboardReportDataExport } from './export.js';

const commands: Command[] = [
  dashboardReportDataRun,
  dashboardReportDataExport,
];

export default commands;
export { dashboardReportDataRun };
export { dashboardReportDataExport };
