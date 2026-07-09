import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalJsonArray,
  optionalNumber,
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
    { name: 'dashboard-id', type: 'number', required: false, desc: 'Single dashboard ID to export. The gateway resolves folder or project-space context.' },
    { name: 'dashboard-ids', type: 'json', required: false, desc: 'Dashboard ID array to export. The gateway resolves folder or project-space context.' },
    { name: 'dashboard-folder-ids', type: 'json', required: false, desc: 'Private folder ID array, or advanced descriptor array: [{"dashboard_folder_id":1,"dashboard_ids":[2]}].' },
    { name: 'shared-spaces', type: 'json', required: false, desc: 'Shared space export descriptor array.' },
    { name: 'export-file-name', type: 'string', required: false, desc: 'Optional export file name.' },
    payloadFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_id: optionalNumber(ctx, 'dashboard-id'),
    dashboard_ids: optionalJsonArray(ctx, 'dashboard-ids'),
    dashboard_folder_ids: optionalJsonArray(ctx, 'dashboard-folder-ids'),
    shared_spaces: optionalJson(ctx, 'shared-spaces'),
    export_file_name: optionalString(ctx, 'export-file-name'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
