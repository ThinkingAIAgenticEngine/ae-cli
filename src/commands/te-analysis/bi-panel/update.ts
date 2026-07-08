import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalString,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelUpdate = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'update',
  capabilityId: 'analysis.bi_panel.update',
  description: 'Update BI panel content or metadata.',
  flags: [
    projectIdFlag,
    { name: 'panel-name', type: 'string', required: false, desc: 'BI panel name.' },
    { name: 'panel-uuid', type: 'string', required: false, desc: 'BI panel UUID.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_name: optionalString(ctx, 'panel-name'),
    panel_uuid: optionalString(ctx, 'panel-uuid'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
