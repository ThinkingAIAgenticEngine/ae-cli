import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
} from '../capability-shared.js';
import { dailyReportUpdateFlags, dailyReportUpdateInput } from './shared.js';

export const dashboardDailyReportUpdate = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'update',
  capabilityId: 'analysis.dashboard_daily_report.update',
  description: 'Create or update dashboard daily report configuration. Omitted fields remain unchanged.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    ...dailyReportUpdateFlags(),
    { ...payloadFlag, sensitive: true },
  ],
  risk: 'write',
  buildInput: dailyReportUpdateInput,
});
