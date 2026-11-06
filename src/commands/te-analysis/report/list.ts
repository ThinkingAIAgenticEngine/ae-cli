import {
  certificationScopeFlag,
  createAnalysisCapabilityCommand,
  manageableOnlyFlag,
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
  description: 'List readable reports. For management workflows use --manageable-only. Use analysis asset search for asset discovery.',
  flags: [
    projectIdFlag,
    queriesFlag,
    manageableOnlyFlag,
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
