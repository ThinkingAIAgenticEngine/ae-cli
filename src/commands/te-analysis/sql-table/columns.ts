import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
  optionalString,
  compactInput,
  sqlTableUsageFlag,
} from '../capability-shared.js';

export const sqlTableColumns = createAnalysisCapabilityCommand({
  resource: 'sql-table',
  command: 'columns',
  capabilityId: 'analysis.sql_table.columns',
  description: 'List columns for an exact server-authorized SQL table reference. When copying a Trino column containing #, $, @, spaces, or punctuation into SQL, delimit the identifier with double quotes, for example "#user_id" or "$part_event". Queries against an event table must include a date-partition predicate on the quoted "$part_date" column; the backend rejects event-table SQL without it.',
  flags: [
    projectIdFlag,
    {
      name: 'table-ref',
      type: 'string',
      required: true,
      desc: 'Exact table_ref returned by analysis sql-table list; a unique table-only reference is also accepted.',
    },
    sqlTableUsageFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    table_ref: ctx.str('table-ref'),
    usage: optionalString(ctx, 'usage'),
  }),
});
