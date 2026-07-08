import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardCreate = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'create',
  capabilityId: 'analysis.dashboard.create',
  description: 'Create a dashboard in personal space, project space, or a folder.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-name', type: 'string', required: true, desc: 'Dashboard name.' },
    { name: 'space-id', type: 'number', required: false, desc: 'Target project space ID. Omit for personal space.' },
    { name: 'folder-id', type: 'number', required: false, desc: 'Target folder ID.' },
    { name: 'initial-report-id', type: 'number', required: false, desc: 'Optional report ID to add when creating the dashboard.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_name: ctx.str('dashboard-name'),
    space_id: optionalNumber(ctx, 'space-id'),
    folder_id: optionalNumber(ctx, 'folder-id'),
    initial_report_id: optionalNumber(ctx, 'initial-report-id'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
