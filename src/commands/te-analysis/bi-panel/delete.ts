import {
  createAnalysisCapabilityCommand,
  jsonArray,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelDelete = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'delete',
  capabilityId: 'analysis.bi_panel.delete',
  description: 'Delete one or more BI panels.',
  flags: [projectIdFlag, { name: 'panel-ids', type: 'json', required: true, desc: 'BI panel ID array.' }],
  risk: 'write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    panel_ids: jsonArray(ctx, 'panel-ids'),
  }),
});
