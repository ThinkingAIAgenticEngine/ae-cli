import {
  createAnalysisCapabilityCommand,
  directoryLimitFlag,
  compactInput,
  directoryOffsetFlag,
  optionalNumber,
  optionalString,
  projectIdFlag,
  sqlTableUsageFlag,
} from '../capability-shared.js';
import { optionalQueries, queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const sqlTableList = createAnalysisCapabilityCommand({
  resource: 'sql-table',
  command: 'list',
  capabilityId: 'analysis.sql_table.list',
  description: 'List server-authoritative SQL table references queryable by the current user in a project.',
  flags: [projectIdFlag, queriesFlag, directoryLimitFlag, directoryOffsetFlag, sqlTableUsageFlag],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    queries: optionalQueries(ctx),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    usage: optionalString(ctx, 'usage'),
  }),
});
