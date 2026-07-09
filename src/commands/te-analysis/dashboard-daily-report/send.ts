import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../capability-shared.js';
import { dailyReportFlags, dailyReportInput } from './shared.js';

export const dashboardDailyReportSend = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'send',
  capabilityId: 'analysis.dashboard_daily_report.send',
  description: 'Send dashboard daily report immediately.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    ...dailyReportFlags(false),
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => dailyReportInput(ctx, false),
});
