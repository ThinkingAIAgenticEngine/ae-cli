import { createAnalysisCapabilityCommand, projectIdFlag, projectInput } from '../capability-shared.js';

export const dashboardReportGet = createAnalysisCapabilityCommand({
  resource: 'dashboard-report',
  command: 'get',
  capabilityId: 'analysis.dashboard_report.get',
  description: 'Get one analysis-board report card frame size, saved grid position, dashboard layout version, and event presentation; not the source report definition.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard containing the report card.' },
    { name: 'report-id', type: 'number', required: true, desc: 'Existing report ID on that dashboard. Event cards also return chart and table presentation.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    report_id: ctx.num('report-id'),
  }),
});
