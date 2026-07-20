import {
  compactInput,
  createAnalysisCapabilityCommand,
  fieldsFlag,
  limitFlag,
  offsetFlag,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  queryFlag,
} from '../../capability-shared.js';

export const projectMarkTimeList = createAnalysisCapabilityCommand({
  resource: 'project mark-time',
  command: 'list',
  capabilityId: 'project.mark_time.list',
  description: 'List project date markers.',
  flags: [
    projectIdFlag,
    queryFlag,
    fieldsFlag,
    limitFlag,
    offsetFlag,
    { name: 'zone-offset', type: 'number', required: false, desc: 'Dashboard locked time zone offset.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
  }),
});
