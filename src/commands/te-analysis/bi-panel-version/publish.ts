import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelVersionPublish = createAnalysisCapabilityCommand({
  resource: 'bi-panel-version',
  command: 'publish',
  capabilityId: 'analysis.bi_panel_version.publish',
  description: 'Publish the current BI panel draft. Requires source version returned by bi-panel-version get.',
  flags: [
    projectIdFlag,
    { name: 'panel-id', type: 'number', required: false, desc: 'BI panel ID. Required when --panel-uuid is omitted.' },
    { name: 'panel-uuid', type: 'string', required: false, desc: 'BI panel UUID. Required when --panel-id is omitted.' },
    { name: 'source-version', type: 'string', required: true, desc: 'Current draft version to publish, for example 0.1.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_id: ctx.str('panel-id') === '' ? undefined : ctx.num('panel-id'),
    panel_uuid: optionalString(ctx, 'panel-uuid'),
    source_version: ctx.str('source-version'),
  }),
});
