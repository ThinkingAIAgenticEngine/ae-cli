import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelCreate = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'create',
  capabilityId: 'analysis.bi_panel.create',
  description: 'Create an empty BI dashboard shell without draft or release content.',
  flags: [
    projectIdFlag,
    { name: 'panel-name', type: 'string', required: true, desc: 'Name for the new empty BI dashboard shell.' },
    { name: 'space-id', type: 'number', required: false, desc: 'Target project space ID.' },
    { name: 'folder-id', type: 'number', required: false, desc: 'Target folder ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_name: ctx.str('panel-name'),
    space_id: optionalNumber(ctx, 'space-id'),
    folder_id: optionalNumber(ctx, 'folder-id'),
  }),
});
