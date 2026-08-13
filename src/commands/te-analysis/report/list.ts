import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  directoryOffsetFlag,
  projectIdFlag,
  reportListInput,
  reportListLimitFlag,
  reportModelTypesFlag,
} from '../capability-shared.js';
import { queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const reportList = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'list',
  capabilityId: 'analysis.report.list',
  description: 'List analysis reports visible to the current user through the capability gateway.',
  flags: [projectIdFlag, queriesFlag, fieldsFlag, reportModelTypesFlag, reportListLimitFlag, directoryOffsetFlag],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: reportListInput,
});
