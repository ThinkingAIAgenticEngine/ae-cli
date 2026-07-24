import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardDailyReportSendStatus = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'send-status',
  capabilityId: 'analysis.dashboard_daily_report.send_status',
  description: 'Get the progress and per-channel result of one dashboard daily report send task.',
  flags: [
    projectIdFlag,
    { name: 'task-id', type: 'number', required: true, desc: 'Task ID returned by dashboard-daily-report send.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    task_id: ctx.num('task-id'),
  }),
});
