import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardCopy = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'copy',
  capabilityId: 'analysis.dashboard.copy',
  description: 'Copy a dashboard, optionally copying reports and targeting a project space or folder.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Source dashboard ID.' },
    { name: 'dashboard-name', type: 'string', required: true, desc: 'New dashboard name.' },
    { name: 'report-copy', type: 'boolean', required: false, desc: 'Whether to copy reports. Default: false.' },
    { name: 'to-space-id', type: 'number', required: false, desc: 'Target project space ID.' },
    { name: 'to-folder-id', type: 'number', required: false, desc: 'Target folder ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    dashboard_name: ctx.str('dashboard-name'),
    report_copy: optionalBoolean(ctx, 'report-copy'),
    to_space_id: optionalNumber(ctx, 'to-space-id'),
    to_folder_id: optionalNumber(ctx, 'to-folder-id'),
  }),
});
