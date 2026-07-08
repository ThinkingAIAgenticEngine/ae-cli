import {
  createAnalysisCapabilityCommand,
  jsonArray,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardHandover = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'handover',
  capabilityId: 'analysis.dashboard.handover',
  description: 'Handover one or more dashboards to another project user.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-ids', type: 'json', required: true, desc: 'Dashboard ID array.' },
    { name: 'to-user-id', type: 'number', required: true, desc: 'Target user ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_ids: jsonArray(ctx, 'dashboard-ids'),
    to_user_id: ctx.num('to-user-id'),
  }),
});
