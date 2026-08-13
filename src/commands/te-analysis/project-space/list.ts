import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryLimitFlag,
  listInput,
  directoryOffsetFlag,
  projectIdFlag,
} from '../capability-shared.js';
import { queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const projectSpaceList = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'list',
  capabilityId: 'analysis.project_space.list',
  description: 'List project spaces visible to the current user.',
  flags: [projectIdFlag, queriesFlag, fieldsFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: listInput,
});
