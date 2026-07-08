import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardShare = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'share',
  capabilityId: 'analysis.dashboard.share',
  description: 'Modify dashboard sharing members through the capability gateway.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'member-authorities', type: 'json', required: false, desc: 'Optional member authority map.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    member_authorities: optionalJson(ctx, 'member-authorities'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
