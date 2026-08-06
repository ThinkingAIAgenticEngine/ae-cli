import {
  analysisDataRunRoutingHelp,
  biPanelPageDataInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  previewRowsFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';

export const biPanelPageDataRun = createAnalysisCapabilityCommand({
  resource: 'bi-panel-page-data',
  command: 'run',
  capabilityId: 'analysis.bi_panel_page_data.run',
  description: `Run a BI panel page query with the same chart result cap as the UI and return has_more when that cap is reached. BI SQL chart data does not support analysis model drilldown or result-cluster creation. ${analysisDataRunRoutingHelp}`,
  flags: [
    projectIdFlag,
    { name: 'panel-id', type: 'number', required: true, desc: 'BI panel ID.' },
    { name: 'page-key', type: 'string', required: true, desc: 'Page key returned by bi-panel get.' },
    { name: 'result-type', type: 'string', required: true, desc: 'Result type: charts or summary.' },
    { name: 'chart-ids', type: 'json', required: false, desc: 'Optional chart ID array.' },
    { name: 'parameter-controls', type: 'json', required: false, desc: 'Optional parameter control override array.' },
    { name: 'permission-controls', type: 'json', required: false, desc: 'Optional permission control array.' },
    { name: 'chart-filter-controls', type: 'json', required: false, desc: 'Optional chart filter control array.' },
    { name: 'columns', type: 'json', required: false, desc: 'Optional returned column array.' },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    previewRowsFlag,
    syncTimeoutSecondsFlag,
  ],
  risk: 'read',
  buildInput: biPanelPageDataInput,
});
