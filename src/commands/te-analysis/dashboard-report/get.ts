import { createAnalysisCapabilityCommand, projectIdFlag, projectInput } from '../capability-shared.js';

export const dashboardReportGet = createAnalysisCapabilityCommand({
  resource: 'dashboard-report',
  command: 'get',
  capabilityId: 'analysis.dashboard_report.get',
  description: 'Get an event report card presentation on one analysis dashboard, not the source report definition.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard containing the report card.' },
    { name: 'report-id', type: 'number', required: true, desc: 'Existing event report ID on that dashboard.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    report_id: ctx.num('report-id'),
  }),
});
