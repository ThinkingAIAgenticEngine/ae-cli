import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryLimitFlag,
  listInput,
  directoryOffsetFlag,
  projectIdFlag,
} from '../capability-shared.js';
import { queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const biPanelList = createAnalysisCapabilityCommand({
  resource: 'bi-panel',
  command: 'list',
  capabilityId: 'analysis.bi_panel.list',
  description: 'List BI panels visible to the current user through the capability gateway.',
  flags: [projectIdFlag, queriesFlag, fieldsFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: listInput,
});
