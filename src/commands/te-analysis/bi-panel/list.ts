import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryLimitFlag,
  listInput,
  directoryOffsetFlag,
  projectIdFlag,
  queryFlag,
} from '../capability-shared.js';

export const biPanelList = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'list',
  capabilityId: 'analysis.bi_panel.list',
  description: 'List BI panels visible to the current user through the capability gateway.',
  flags: [projectIdFlag, queryFlag, fieldsFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  buildInput: listInput,
});
