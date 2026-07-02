import type { Command } from '../../../framework/types.js';
import { listReports } from './list-reports.js';
import { getReportDefinition } from './get-report-definition.js';
import { queryReportData } from './query-report-data.js';
import { createReport } from './create-report.js';
import { deleteReport } from './delete-report.js';
import { updateReport } from './update-report.js';

const commands: Command[] = [
  listReports,
  getReportDefinition,
  queryReportData,
  createReport,
  deleteReport,
  updateReport,
];

export default commands;
export { listReports };
export { getReportDefinition };
export { queryReportData };
export { createReport };
