import {
  createAnalysisCapabilityCommand,
  jsonArray,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardReportAdd = createAnalysisCapabilityCommand({
  resource: 'dashboard-report',
  command: 'add',
  capabilityId: 'analysis.dashboard_report.add',
  description: 'Add existing analysis reports to a dashboard.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'report-ids', type: 'json', required: true, desc: 'Report ID array to add.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    report_ids: jsonArray(ctx, 'report-ids'),
  }),
});
