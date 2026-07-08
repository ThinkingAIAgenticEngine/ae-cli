import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  limitFlag,
  listInput,
  offsetFlag,
  projectIdFlag,
  queryFlag,
} from '../capability-shared.js';

export const publicLinkList = createAnalysisCapabilityCommand({
  resource: 'public-link',
  command: 'list',
  capabilityId: 'analysis.public_link.list',
  description: 'List public links in a project.',
  flags: [projectIdFlag, queryFlag, fieldsFlag, limitFlag, offsetFlag],
  risk: 'read',
  buildInput: listInput,
});
