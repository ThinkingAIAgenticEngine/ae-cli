import { createAnalysisCapabilityCommand, directoryLimitFlag, directoryOffsetFlag, listInput, projectIdFlag } from '../capability-shared.js';
import { queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const dashboardList = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'list',
  capabilityId: 'analysis.dashboard.list',
  description: 'List dashboards visible to the current user through the capability gateway.',
  flags: [
    projectIdFlag,
    queriesFlag,
    {
      name: 'fields',
      type: 'json',
      required: false,
      desc: 'Optional projection field array. Supported fields: dashboard_id, dashboard_name, remark.',
      alias: 'f',
    },
    directoryLimitFlag,
    directoryOffsetFlag,
  ],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: listInput,
});
