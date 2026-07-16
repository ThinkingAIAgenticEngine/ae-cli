import {
  analysisDataExportRoutingHelp,
  asyncTimeoutSecondsFlag,
  createAnalysisCapabilityCommand,
  dashboardReportDataInput,
  projectIdFlag,
} from '../capability-shared.js';

export const dashboardReportDataExport = createAnalysisCapabilityCommand({
  resource: 'dashboard-report-data',
  command: 'export',
  capabilityId: 'analysis.dashboard_report_data.export',
  description: `Submit dashboard report data as an asynchronous gzip JSONL artifact. Filters and time overrides do not apply to SQL reports; the artifact still contains data plus structured warnings. The submit response and artifact metadata line contain query_context_id when Redis context creation succeeds. ${analysisDataExportRoutingHelp}`,
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'report-ids', type: 'json', required: false, desc: 'Optional report ID array. Omit to query all dashboard reports.' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional AI-facing filter {relation,items:[{field:{name,type?},operator,values?}]}. SQL reports ignore it and the artifact includes warnings; raw taFilters/junctionKind/filts are rejected.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Optional start date/time. SQL reports ignore it and the artifact includes warnings.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Optional end date/time. SQL reports ignore it and the artifact includes warnings.' },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    asyncTimeoutSecondsFlag,
    { name: 'artifact-format', type: 'string', required: false, desc: 'Artifact format. Only jsonl is supported.' },
  ],
  risk: 'read',
  buildInput: dashboardReportDataInput,
});
