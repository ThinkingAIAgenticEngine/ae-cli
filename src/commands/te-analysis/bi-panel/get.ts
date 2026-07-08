import {
  compactInput,
  createAnalysisCapabilityCommand,
  fieldsFlag,
  optionalJson,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelGet = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'get',
  capabilityId: 'analysis.bi_panel.get',
  description: 'Get a BI panel released page structure.',
  flags: [
    projectIdFlag,
    { name: 'panel-id', type: 'number', required: true, desc: 'BI panel ID.' },
    fieldsFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_id: ctx.num('panel-id'),
    fields: optionalJson(ctx, 'fields'),
  }),
});
