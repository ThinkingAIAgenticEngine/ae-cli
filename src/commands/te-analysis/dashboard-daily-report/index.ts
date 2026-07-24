import type { Command } from '../../../framework/types.js';
import { dashboardDailyReportGet } from './get.js';
import { dashboardDailyReportUpdate } from './update.js';
import { dashboardDailyReportSend } from './send.js';
import { dashboardDailyReportSendStatus } from './send-status.js';

const commands: Command[] = [
  dashboardDailyReportGet,
  dashboardDailyReportUpdate,
  dashboardDailyReportSend,
  dashboardDailyReportSendStatus,
];

export default commands;
export { dashboardDailyReportGet };
export { dashboardDailyReportUpdate };
export { dashboardDailyReportSend };
export { dashboardDailyReportSendStatus };
