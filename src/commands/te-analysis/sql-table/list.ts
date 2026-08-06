import {
  createAnalysisCapabilityCommand,
  directoryLimitFlag,
  compactInput,
  directoryOffsetFlag,
  optionalNumber,
  optionalString,
  projectIdFlag,
  queryFlag,
  sqlTableUsageFlag,
} from '../capability-shared.js';

export const sqlTableList = createAnalysisCapabilityCommand({
  resource: 'sql-table',
  command: 'list',
  capabilityId: 'analysis.sql_table.list',
  description: 'List server-authoritative SQL table references queryable by the current user in a project.',
  flags: [projectIdFlag, queryFlag, directoryLimitFlag, directoryOffsetFlag, sqlTableUsageFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    query: optionalString(ctx, 'query'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    usage: optionalString(ctx, 'usage'),
  }),
});
