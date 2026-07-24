import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelUpdate = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'update',
  capabilityId: 'analysis.bi_panel.update',
  description: 'Rename a BI dashboard without changing draft or release content.',
  flags: [
    projectIdFlag,
    { name: 'panel-name', type: 'string', required: true, desc: 'New BI dashboard name.' },
    { name: 'panel-uuid', type: 'string', required: true, desc: 'BI dashboard UUID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_name: ctx.str('panel-name'),
    panel_uuid: ctx.str('panel-uuid'),
  }),
});
