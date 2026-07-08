import {
  createAnalysisCapabilityCommand,
  dashboardReportDataInput,
  projectIdFlag,
} from '../capability-shared.js';

export const dashboardReportDataExport = createAnalysisCapabilityCommand({
  resource: 'dashboard-report-data',
  command: 'export',
  capabilityId: 'analysis.dashboard_report_data.export',
  description: 'Submit a dashboard report data query as an asynchronous gzip JSONL artifact.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'report-ids', type: 'json', required: false, desc: 'Optional report ID array. Omit to query all dashboard reports.' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional dashboard filter JSON.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Optional start date/time.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Optional end date/time.' },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    { name: 'timeout-seconds', type: 'number', required: false, desc: 'Export timeout seconds. Default: 3600, max: 7200.' },
    { name: 'artifact-format', type: 'string', required: false, desc: 'Artifact format. Only jsonl is supported.' },
  ],
  risk: 'read',
  buildInput: dashboardReportDataInput,
});
