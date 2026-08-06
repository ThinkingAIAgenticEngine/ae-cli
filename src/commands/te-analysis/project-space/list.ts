import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryLimitFlag,
  listInput,
  directoryOffsetFlag,
  projectIdFlag,
  queryFlag,
} from '../capability-shared.js';

export const projectSpaceList = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'list',
  capabilityId: 'analysis.project_space.list',
  description: 'List project spaces visible to the current user.',
  flags: [projectIdFlag, queryFlag, fieldsFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  buildInput: listInput,
});
