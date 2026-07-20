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

export const projectEntityList = createAnalysisCapabilityCommand({
  resource: 'project entity',
  command: 'list',
  capabilityId: 'project.entity.list',
  description: 'List analysis entities in a project.',
  flags: [
    projectIdFlag,
    queryFlag,
    fieldsFlag,
    limitFlag,
    offsetFlag,
    { name: 'event-name', type: 'string', required: false, desc: 'Optional event name. When present, return entities related to the event.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    event_name: optionalString(ctx, 'event-name'),
  }),
});
