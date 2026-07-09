import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../capability-shared.js';
import { dailyReportFlags, dailyReportInput } from './shared.js';

export const dashboardDailyReportUpdate = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'update',
  capabilityId: 'analysis.dashboard_daily_report.update',
  description: 'Update dashboard daily report configuration.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    ...dailyReportFlags(true),
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => dailyReportInput(ctx, true),
});
