import {
  analysisDataExportRoutingHelp,
  asyncTimeoutSecondsFlag,
  biPanelPageDataInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../capability-shared.js';

export const biPanelPageDataExport = createAnalysisCapabilityCommand({
  resource: 'bi-panel-page-data',
  command: 'export',
  capabilityId: 'analysis.bi_panel_page_data.export',
  asyncArtifact: true,
  description: `Stream complete BI panel chart data into an asynchronous gzip JSONL artifact under Common's full-download row cap. BI SQL chart exports do not create analysis drilldown contexts. ${analysisDataExportRoutingHelp}`,
  flags: [
    projectIdFlag,
    { name: 'panel-id', type: 'number', required: true, desc: 'BI panel ID.' },
    { name: 'page-key', type: 'string', required: true, desc: 'Page key returned by bi-panel get.' },
    { name: 'result-type', type: 'string', required: true, desc: 'Must be charts. Summary is presentation data and is available only from run.' },
    { name: 'chart-ids', type: 'json', required: false, desc: 'Optional chart ID array.' },
    { name: 'parameter-controls', type: 'json', required: false, desc: 'Optional parameter control override array.' },
    { name: 'permission-controls', type: 'json', required: false, desc: 'Optional permission control array.' },
    { name: 'chart-filter-controls', type: 'json', required: false, desc: 'Optional chart filter control array.' },
    { name: 'columns', type: 'json', required: false, desc: 'Optional returned column array.' },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    asyncTimeoutSecondsFlag,
    { name: 'artifact-format', type: 'string', required: false, desc: 'Artifact format. Only jsonl is supported.' },
  ],
  risk: 'read',
  buildInput: biPanelPageDataInput,
});
