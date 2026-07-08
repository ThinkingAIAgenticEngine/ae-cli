import {
  biPanelPageDataInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from '../capability-shared.js';

export const biPanelPageDataExport = createAnalysisCapabilityCommand({
  resource: 'bi-panel-page-data',
  command: 'export',
  capabilityId: 'analysis.bi_panel_page_data.export',
  description: 'Submit a BI panel page data query as an asynchronous gzip JSONL artifact.',
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
    { name: 'row-limit', type: 'number', required: false, desc: 'Chart row limit.' },
    { name: 'row-offset', type: 'number', required: false, desc: 'Chart row offset.' },
    { name: 'block-limit', type: 'number', required: false, desc: 'Summary block limit.' },
    { name: 'block-offset', type: 'number', required: false, desc: 'Summary block offset.' },
    { name: 'use-cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    { name: 'timeout-seconds', type: 'number', required: false, desc: 'Export timeout seconds. Default: 600, max: 600.' },
    { name: 'artifact-format', type: 'string', required: false, desc: 'Artifact format. Only jsonl is supported.' },
  ],
  risk: 'read',
  buildInput: biPanelPageDataInput,
});
