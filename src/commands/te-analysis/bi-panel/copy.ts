import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  optionalString,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelCopy = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'copy',
  capabilityId: 'analysis.bi_panel.copy',
  description: 'Copy a BI panel.',
  flags: [
    projectIdFlag,
    { name: 'panel-name', type: 'string', required: false, desc: 'New BI panel name.' },
    { name: 'panel-uuid', type: 'string', required: false, desc: 'Source BI panel UUID.' },
    { name: 'space-id', type: 'number', required: false, desc: 'Target project space ID.' },
    { name: 'folder-id', type: 'number', required: false, desc: 'Target folder ID.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_name: optionalString(ctx, 'panel-name'),
    panel_uuid: optionalString(ctx, 'panel-uuid'),
    space_id: optionalNumber(ctx, 'space-id'),
    folder_id: optionalNumber(ctx, 'folder-id'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
