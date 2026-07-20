import {
  compactInput,
  createAnalysisCapabilityCommand,
  fieldsFlag,
  limitFlag,
  offsetFlag,
  optionalJson,
  optionalNumber,
  optionalString,
  queryFlag,
} from '../../capability-shared.js';

export const projectInfoList = createAnalysisCapabilityCommand({
  resource: 'project info',
  command: 'list',
  capabilityId: 'project.info.list',
  description: 'List projects accessible to the current user.',
  flags: [
    queryFlag,
    fieldsFlag,
    limitFlag,
    offsetFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
