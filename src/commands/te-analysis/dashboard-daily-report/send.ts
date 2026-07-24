import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../capability-shared.js';
import { dailyReportSendFlags, dailyReportSendInput } from './shared.js';

export const dashboardDailyReportSend = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'send',
  capabilityId: 'analysis.dashboard_daily_report.send',
  description: 'Send dashboard daily report immediately. Destination fields infer channels; omit them to reuse saved destinations.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    ...dailyReportSendFlags(),
    { ...payloadFlag, sensitive: true },
  ],
  risk: 'write',
  buildInput: dailyReportSendInput,
});
