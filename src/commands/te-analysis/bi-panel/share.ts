import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelShare = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'share',
  capabilityId: 'analysis.bi_panel.share',
  description: 'Modify BI panel sharing members.',
  flags: [projectIdFlag, { name: 'panel-id', type: 'number', required: true, desc: 'BI panel ID.' }, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_id: ctx.num('panel-id'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
