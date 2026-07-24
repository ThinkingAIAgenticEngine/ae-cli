import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardDailyReportGet = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'get',
  capabilityId: 'analysis.dashboard_daily_report.get',
  description: 'Get one dashboard daily report configuration with sensitive values redacted.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
  }),
});
