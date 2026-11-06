import {
  certificationScopeFlag,
  certificationScopeInput,
  compactInput,
  createAnalysisCapabilityCommand,
  manageableOnlyFlag,
  directoryLimitFlag,
  directoryOffsetFlag,
  listInput,
  optionalBoolean,
  projectIdFlag,
} from '../capability-shared.js';
import { queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const dashboardList = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'list',
  capabilityId: 'analysis.dashboard.list',
  description: 'List readable dashboards. For management workflows use --manageable-only. Use analysis asset search for asset discovery.',
  flags: [
    projectIdFlag,
    queriesFlag,
    manageableOnlyFlag,
    {
      name: 'fields',
      type: 'json',
      required: false,
      desc: 'Optional projection field array. Supported fields: dashboard_id, dashboard_name, remark.',
      alias: 'f',
    },
    directoryLimitFlag,
    directoryOffsetFlag,
    certificationScopeFlag,
  ],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: (ctx) => compactInput({
    ...listInput(ctx),
    manageable_only: optionalBoolean(ctx, 'manageable-only'),
    certification_scope: certificationScopeInput(ctx),
  }),
});
