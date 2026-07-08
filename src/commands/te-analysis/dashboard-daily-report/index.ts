import type { Command } from '../../../framework/types.js';
import { dashboardDailyReportUpdate } from './update.js';
import { dashboardDailyReportSend } from './send.js';

const commands: Command[] = [
  dashboardDailyReportUpdate,
  dashboardDailyReportSend,
];

export default commands;
export { dashboardDailyReportUpdate };
export { dashboardDailyReportSend };
