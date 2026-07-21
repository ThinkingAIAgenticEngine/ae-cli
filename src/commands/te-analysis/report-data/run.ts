import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  requestIdFlag,
  syncLimitFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import { reportDataInput, reportDataZoneOffsetDescription } from './shared.js';

export const reportDataRun = createAnalysisCapabilityCommand({
  resource: 'report-data',
  command: 'run',
  capabilityId: 'analysis.report_data.run',
  description: `Run a bounded report data query. Override contract: SQL uses only --sql-params; non-SQL analysis models use filters/group/time; tag uses its saved tag definition. Mixed-model batches continue with structured warnings for ignored fields. ${analysisDataRunRoutingHelp}`,
  flags: [
    projectIdFlag,
    { name: 'report-ids', type: 'json', required: true, desc: 'Report ID array. With overrides, prefer one model per batch; mixed models still return data and meta.warnings identifies report_ids and ignored_fields.' },
    requestIdFlag,
    { name: 'filters', type: 'json', required: false, desc: 'Non-SQL analysis models only. SQL-only requests reject this field; mixed batches warn for SQL report_ids that ignore it. AI-facing shape: {"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}. Never pass QP taFilters.' },
    { name: 'group-by', type: 'json', required: false, desc: 'Non-SQL analysis models only. SQL-only requests reject this field; mixed batches warn. AI-facing shape: [{"field":{"name":"country","type":"user_property"}}]. Time granularity uses --time-granularity.' },
    { name: 'sql-params', type: 'json', required: false, desc: 'SQL reports only. First run analysis report get for every target SQL report; each name must exist in every definition.params. Send value overrides only, for example [{"name":"platform","value":"ios"}] or saved part_date/time parameters with start_time/end_time. Do not send definition fields such as paramType or selectorItems.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Non-SQL analysis-model date override start, yyyy-MM-dd. SQL dates must be saved parameters overridden through --sql-params.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Non-SQL analysis-model date override end, yyyy-MM-dd. SQL dates must be saved parameters overridden through --sql-params.' },
    { name: 'time-granularity', type: 'string', required: false, desc: 'Non-SQL analysis-model time granularity override. SQL accepts only --sql-params.' },
    { name: 'zone-offset', type: 'number', required: false, desc: reportDataZoneOffsetDescription },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    syncLimitFlag,
    syncTimeoutSecondsFlag,
  ],
  risk: 'read',
  buildInput: reportDataInput,
  postProcess: applyAnalysisInlineLimit,
});
