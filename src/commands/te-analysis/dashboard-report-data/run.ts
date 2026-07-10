import {
  createAnalysisCapabilityCommand,
  dashboardReportDataInput,
  limitFlag,
  projectIdFlag,
} from '../capability-shared.js';

export const dashboardReportDataRun = createAnalysisCapabilityCommand({
  resource: 'dashboard-report-data',
  command: 'run',
  capabilityId: 'analysis.dashboard_report_data.run',
  description: 'Run a bounded dashboard report data query and return inline JSON.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'report-ids', type: 'json', required: false, desc: 'Optional report ID array. Omit to query all dashboard reports.' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional analysis Filter JSON injected as commonFilter.aiFilter. Use analysis +get_filter_schema for schema, e.g. {"relation":"and","filts":[...]}.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Optional start date/time.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Optional end date/time.' },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    { name: 'timeout-seconds', type: 'number', required: false, desc: 'Sync timeout seconds. Default: 60, max: 180.' },
    limitFlag,
  ],
  risk: 'read',
  buildInput: dashboardReportDataInput,
});
