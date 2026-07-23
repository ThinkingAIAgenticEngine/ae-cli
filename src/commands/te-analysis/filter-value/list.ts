import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalNumber,
  optionalString,
  projectIdFlag,
} from '../capability-shared.js';

export const filterValueList = createAnalysisCapabilityCommand({
  resource: 'filter-value',
  command: 'list',
  capabilityId: 'analysis.filter_value.list',
  description: 'List stored candidate values for one known event property, user property, user tag, or user cluster before building an exact analysis filter.',
  flags: [
    projectIdFlag,
    { name: 'property-name', type: 'string', required: true, desc: 'Exact property identifier. Resolve the property first; this command discovers values, not fields.' },
    { name: 'table-type', type: 'string', required: true, desc: 'Property table: event or user.' },
    { name: 'event-name', type: 'string', required: false, desc: 'Optional exact event name for an event-property lookup.' },
    { name: 'search-prefix', type: 'string', required: false, desc: 'Optional prefix or fuzzy input to narrow candidate values.' },
    { name: 'zone-offset', type: 'number', required: false, desc: 'Optional fixed timezone offset from -12 through 14.' },
    { name: 'cluster-date-policy', type: 'string', required: false, desc: 'Optional user tag/cluster data-snapshot policy: LATEST means the latest available computed result snapshot, not a tag definition or configuration release; AUTO and SPECIFIED select other snapshot modes.' },
    { name: 'specified-cluster-date', type: 'string', required: false, desc: 'Required only with --cluster-date-policy SPECIFIED to select a historical computed result snapshot; yyyy-MM-dd.' },
    { name: 'report-mode', type: 'boolean', required: false, desc: 'Use report-compatible property semantics. Default: false.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    property_name: ctx.str('property-name'),
    table_type: ctx.str('table-type'),
    event_name: optionalString(ctx, 'event-name'),
    search_prefix: optionalString(ctx, 'search-prefix'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    cluster_date_policy: optionalString(ctx, 'cluster-date-policy'),
    specified_cluster_date: optionalString(ctx, 'specified-cluster-date'),
    report_mode: optionalBoolean(ctx, 'report-mode'),
  }),
});
