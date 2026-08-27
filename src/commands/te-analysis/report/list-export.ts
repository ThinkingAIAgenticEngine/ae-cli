import {
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
  certificationScopeFlag,
  certificationScopeInput,
  compactInput,
  createAnalysisCapabilityCommand,
  exportLifecycleInput,
  fieldsFlag,
  optionalJson,
  projectIdFlag,
  projectInput,
  reportModelTypesFlag,
  requestIdFlag,
} from '../capability-shared.js';
import { optionalQueries, queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const reportListExport = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'list-export',
  capabilityId: 'analysis.report.list_export',
  asyncArtifact: true,
  description: 'Export the accessible report catalog as a gzip artifact.',
  flags: [
    projectIdFlag,
    queriesFlag,
    fieldsFlag,
    reportModelTypesFlag,
    requestIdFlag,
    artifactFormatFlag,
    asyncTimeoutSecondsFlag,
    certificationScopeFlag,
  ],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    queries: optionalQueries(ctx),
    fields: optionalJson(ctx, 'fields'),
    model_types: optionalJson(ctx, 'model-types'),
    certification_scope: certificationScopeInput(ctx),
    ...exportLifecycleInput(ctx),
  }),
});
