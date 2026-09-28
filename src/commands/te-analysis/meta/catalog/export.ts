import {
  compactInput,
  certificationScopeFlag,
  certificationScopeInput,
  createAnalysisMetaCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  requestIdFlag,
  asyncTimeoutSecondsFlag,
} from '../../capability-shared.js';
import {
  catalogArtifactMaterializer,
  preflightCatalogArtifactOutput,
  validateCatalogExportFlags,
} from '../../catalog-list.js';

export const metadataCatalogExport = createAnalysisMetaCapabilityCommand({
  resource: 'catalog',
  command: 'export',
  capabilityId: 'metadata.catalog.export',
  asyncArtifact: {
    preflightOutput: preflightCatalogArtifactOutput,
    materialize: catalogArtifactMaterializer('analysis_metadata'),
  },
  description: 'Export the complete accessible analysis metadata catalog to JSONL with an integrity sidecar.',
  flags: [projectIdFlag, requestIdFlag, asyncTimeoutSecondsFlag, certificationScopeFlag],
  risk: 'read',
  validate: validateCatalogExportFlags,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    certification_scope: certificationScopeInput(ctx),
  }),
});
