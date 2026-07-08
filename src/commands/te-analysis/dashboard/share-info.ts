import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardShareInfo = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'share-info',
  capabilityId: 'analysis.dashboard.share_info',
  description: 'Get dashboard sharing information.',
  flags: [projectIdFlag, { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
  }),
});
