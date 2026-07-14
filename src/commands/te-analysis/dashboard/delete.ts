import {
  createAnalysisCapabilityCommand,
  jsonArray,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardDelete = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'delete',
  capabilityId: 'analysis.dashboard.delete',
  description: 'Delete one or more dashboards.',
  flags: [projectIdFlag, { name: 'dashboard-ids', type: 'json', required: true, desc: 'Dashboard ID array.' }],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_ids: jsonArray(ctx, 'dashboard-ids'),
  }),
});
