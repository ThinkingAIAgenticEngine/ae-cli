import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalJson,
  optionalString,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardDefinitionImport = createAnalysisCapabilityCommand({
  resource: 'dashboard-definition',
  command: 'import',
  capabilityId: 'analysis.dashboard_definition.import',
  description: 'Validate or import dashboard definition JSON. Use --validate-only for import pre-check.',
  flags: [
    projectIdFlag,
    { name: 'definition', type: 'json', required: true, desc: 'Dashboard definition JSON object.' },
    { name: 'validate-only', type: 'boolean', required: false, desc: 'Only validate import conflicts and importable state.' },
    { name: 'dashboard-name-conflict-policy', type: 'string', required: false, desc: 'Optional dashboard name conflict policy.' },
    { name: 'space-dashboard-policy', type: 'string', required: false, desc: 'Optional space/dashboard import policy.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    definition: ctx.json('definition'),
    validate_only: optionalBoolean(ctx, 'validate-only'),
    dashboard_name_conflict_policy: optionalString(ctx, 'dashboard-name-conflict-policy'),
    space_dashboard_policy: optionalString(ctx, 'space-dashboard-policy'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
