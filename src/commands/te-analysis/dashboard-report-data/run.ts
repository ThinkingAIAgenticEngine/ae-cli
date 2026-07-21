import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
  dashboardReportDataInput,
  projectIdFlag,
  syncLimitFlag,
  dashboardSyncTimeoutSecondsFlag,
} from '../capability-shared.js';
import { reportDataZoneOffsetDescription } from '../report-data/shared.js';

export const dashboardReportDataRun = createAnalysisCapabilityCommand({
  resource: 'dashboard-report-data',
  command: 'run',
  capabilityId: 'analysis.dashboard_report_data.run',
  description: `Run a bounded dashboard report data query. Filters and time overrides do not apply to SQL reports; data still returns with data.warnings listing SQL report_ids and ignored_fields. ${analysisDataRunRoutingHelp}`,
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'report-ids', type: 'json', required: false, desc: 'Optional report ID array. Omit to query all dashboard reports.' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional AI-facing filter {relation,items:[{field:{name,type?},operator,values?}]}. SQL reports ignore it and produce data.warnings; raw taFilters/junctionKind/filts are rejected.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Optional start date/time. SQL reports ignore it and produce data.warnings.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Optional end date/time. SQL reports ignore it and produce data.warnings.' },
    { name: 'zone-offset', type: 'number', required: false, desc: reportDataZoneOffsetDescription },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    dashboardSyncTimeoutSecondsFlag,
    syncLimitFlag,
  ],
  risk: 'read',
  buildInput: dashboardReportDataInput,
  postProcess: applyAnalysisInlineLimit,
});
