import {
  compactInput,
  createAnalysisCapabilityCommand,
  jsonArray,
  optionalBoolean,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardFreeze = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'freeze',
  capabilityId: 'analysis.dashboard.freeze',
  description: 'Freeze or unfreeze one or more dashboards.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-ids', type: 'json', required: true, desc: 'Dashboard ID array.' },
    { name: 'freeze', type: 'boolean', required: false, desc: 'true to freeze, false to unfreeze. Default: true.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_ids: jsonArray(ctx, 'dashboard-ids'),
    freeze: optionalBoolean(ctx, 'freeze'),
  }),
});
