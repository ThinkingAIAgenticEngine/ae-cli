import {
  certificationScopeFlag,
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
  description: 'List analysis reports the current user can edit or manage. Read-only reports are excluded; use analysis asset search for readable asset discovery.',
  flags: [
    projectIdFlag,
    queriesFlag,
    fieldsFlag,
    reportModelTypesFlag,
    reportListLimitFlag,
    directoryOffsetFlag,
    certificationScopeFlag,
  ],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: reportListInput,
});
