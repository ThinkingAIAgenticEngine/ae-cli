import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalJsonArray,
  optionalString,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardDefinitionExport = createAnalysisCapabilityCommand({
  resource: 'dashboard-definition',
  command: 'export',
  capabilityId: 'analysis.dashboard_definition.export',
  description: 'Export dashboard definition JSON.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-folder-ids', type: 'json', required: false, desc: 'Dashboard folder IDs to export.' },
    { name: 'shared-spaces', type: 'json', required: false, desc: 'Shared space export descriptor array.' },
    { name: 'export-file-name', type: 'string', required: false, desc: 'Optional export file name.' },
    payloadFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_folder_ids: optionalJsonArray(ctx, 'dashboard-folder-ids'),
    shared_spaces: optionalJson(ctx, 'shared-spaces'),
    export_file_name: optionalString(ctx, 'export-file-name'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
