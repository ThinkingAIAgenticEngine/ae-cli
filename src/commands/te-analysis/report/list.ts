import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryOffsetFlag,
  projectIdFlag,
  queryFlag,
  reportListInput,
  reportListLimitFlag,
  reportModelTypesFlag,
} from '../capability-shared.js';

export const reportList = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'list',
  capabilityId: 'analysis.report.list',
  description: 'List analysis reports visible to the current user through the capability gateway.',
  flags: [projectIdFlag, queryFlag, fieldsFlag, reportModelTypesFlag, reportListLimitFlag, directoryOffsetFlag],
  risk: 'read',
  buildInput: reportListInput,
});
