import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardTaskStatus = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'task-status',
  capabilityId: 'analysis.dashboard.task_status',
  description: 'Get dashboard scheduled task status.',
  flags: [projectIdFlag, { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
  }),
});
