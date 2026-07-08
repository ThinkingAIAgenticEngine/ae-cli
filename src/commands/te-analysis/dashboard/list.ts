import {
  createAnalysisCapabilityCommand,
  fieldsFlag,
  limitFlag,
  listInput,
  offsetFlag,
  projectIdFlag,
  queryFlag,
} from '../capability-shared.js';

export const dashboardList = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'list',
  capabilityId: 'analysis.dashboard.list',
  description: 'List dashboards visible to the current user through the capability gateway.',
  flags: [projectIdFlag, queryFlag, fieldsFlag, limitFlag, offsetFlag],
  risk: 'read',
  buildInput: listInput,
});
