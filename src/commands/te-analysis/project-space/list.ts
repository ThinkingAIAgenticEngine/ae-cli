import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  limitFlag,
  listInput,
  offsetFlag,
  projectIdFlag,
  queryFlag,
} from '../capability-shared.js';

export const projectSpaceList = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'list',
  capabilityId: 'analysis.project_space.list',
  description: 'List project spaces visible to the current user.',
  flags: [projectIdFlag, queryFlag, fieldsFlag, limitFlag, offsetFlag],
  risk: 'read',
  buildInput: listInput,
});
