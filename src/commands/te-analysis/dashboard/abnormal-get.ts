import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardAbnormalGet = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'abnormal-get',
  capabilityId: 'analysis.dashboard.abnormal_get',
  description: 'Get abnormal dependency information for a dashboard.',
  flags: [projectIdFlag, { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
  }),
});
