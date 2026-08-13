import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryLimitFlag,
  listInput,
  directoryOffsetFlag,
  projectIdFlag,
} from '../capability-shared.js';
import { queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const publicLinkList = createAnalysisCapabilityCommand({
  resource: 'public-link',
  command: 'list',
  capabilityId: 'analysis.public_link.list',
  description: 'List public links in a project.',
  flags: [projectIdFlag, queriesFlag, fieldsFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: listInput,
});
