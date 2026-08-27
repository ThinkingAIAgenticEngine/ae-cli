import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardGet = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'get',
  capabilityId: 'analysis.dashboard.get',
  description: 'Get one dashboard detail, including normalized effective settings, saved filter configuration, location, reports, notes, and sharing context.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cached dashboard detail. Default: true.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
  }),
});
