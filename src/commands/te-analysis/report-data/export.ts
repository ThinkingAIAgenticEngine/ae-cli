import {
  analysisDataExportRoutingHelp,
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
  clusterQueryScopeFlag,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requestIdFlag,
  slaveClusterIdFlag,
  validateClusterQueryRouting,
} from '../capability-shared.js';
import { reportDataExportInput, reportDataZoneOffsetDescription } from './shared.js';

export const reportDataExport = createAnalysisCapabilityCommand({
  resource: 'report-data',
  command: 'export',
  capabilityId: 'analysis.report_data.export',
  description: `Submit report data as an asynchronous gzip artifact. Override contract: SQL uses only --sql-params; non-SQL analysis models use filters/group/time; tag uses its saved tag definition. Mixed-model batches are best-effort. Exports do not create interactive drilldown contexts. ${analysisDataExportRoutingHelp}`,
  flags: [
    projectIdFlag,
    { name: 'report-ids', type: 'json', required: true, desc: 'Report ID array. With overrides, prefer one model per batch so every field has the same meaning.' },
    requestIdFlag,
    { name: 'filters', type: 'json', required: false, desc: 'Non-SQL analysis models only. SQL-only requests reject this field; mixed batches are best-effort. Use AI-facing field intent, never QP taFilters.' },
    { name: 'group-by', type: 'json', required: false, desc: 'Non-SQL analysis models only. SQL-only requests reject this field. Shape: [{"field":{"name":"country","type":"user_property"}}].' },
    { name: 'sql-params', type: 'json', required: false, desc: 'SQL reports only. First run analysis report get for every target SQL report; each name must exist in every definition.params. Send value overrides only, including saved part_date/time parameters for date changes. Do not send definition fields such as paramType, selectorItems, or use_timezone.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Non-SQL analysis-model date override start, yyyy-MM-dd. SQL dates use --sql-params.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Non-SQL analysis-model date override end, yyyy-MM-dd. SQL dates use --sql-params.' },
    { name: 'time-granularity', type: 'string', required: false, desc: 'Non-SQL analysis-model time granularity override. SQL accepts only --sql-params.' },
    clusterQueryScopeFlag,
    slaveClusterIdFlag,
    { name: 'zone-offset', type: 'number', required: false, desc: reportDataZoneOffsetDescription },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    artifactFormatFlag,
    asyncTimeoutSecondsFlag,
  ],
  risk: 'read',
  validate: validateClusterQueryRouting,
  buildInput: reportDataExportInput,
});
