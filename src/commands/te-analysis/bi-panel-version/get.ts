import {
  compactInput,
  createAnalysisCapabilityCommand,
  fieldsFlag,
  optionalJson,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const biPanelVersionGet = createAnalysisCapabilityCommand({
  resource: 'bi-panel-version',
  command: 'get',
  capabilityId: 'analysis.bi_panel_version.get',
  description: 'Get a BI panel release or draft version. Use draft to inspect unpublished edits.',
  flags: [
    projectIdFlag,
    { name: 'panel-id', type: 'number', required: false, desc: 'BI panel ID. Required when --panel-uuid is omitted.' },
    { name: 'panel-uuid', type: 'string', required: false, desc: 'BI panel UUID. Required when --panel-id is omitted.' },
    { name: 'version-type', type: 'string', required: false, desc: 'Version to inspect: release or draft. Default: release.' },
    fieldsFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    panel_id: ctx.str('panel-id') === '' ? undefined : ctx.num('panel-id'),
    panel_uuid: optionalString(ctx, 'panel-uuid'),
    version_type: optionalString(ctx, 'version-type'),
    fields: optionalJson(ctx, 'fields'),
  }),
});
