import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl, executeCapabilityWithEnvelope } from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';
import { withAsyncArtifactLifecycle } from '../../../core/analysis-async-artifact.js';
import {
  materializeProjectSemanticAssetPackage,
  preflightAssetPackageOutput,
} from './materializer.js';

const ASSET_PACKAGE_EXPORT_CAPABILITY = 'business_semantics.asset_package.export';
const ASSET_SCOPES = new Set(['governed', 'collaborative', 'all_visible']);

function assetScope(ctx: RuntimeContext): string {
  const value = ctx.str('asset-scope') || 'governed';
  if (!ASSET_SCOPES.has(value)) {
    throw new Error('asset-scope must be one of: governed, collaborative, all_visible');
  }
  return value;
}

const assetPackageExportCommand: Command = {
  service: 'project-semantic',
  resource: 'asset-package',
  command: 'export',
  description: 'Export and materialize a project asset package for CLI Agent semantic recommendation.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    {
      name: 'asset-scope',
      type: 'string',
      required: false,
      desc: 'Asset scope: governed, collaborative, or all_visible. Defaults to governed.',
    },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      resolveGatewayDomain('analysis', 'analysis'),
      `capabilities/${ASSET_PACKAGE_EXPORT_CAPABILITY}/execute`,
    ),
    body: { input: { project_id: ctx.num('project-id'), asset_scope: assetScope(ctx) } },
  }),
  execute: async (ctx) => {
    const projectId = ctx.num('project-id');
    const scope = assetScope(ctx);
    const response = await executeCapabilityWithEnvelope(
      ctx.host(),
      resolveGatewayDomain('analysis', 'analysis'),
      ASSET_PACKAGE_EXPORT_CAPABILITY,
      { project_id: projectId, asset_scope: scope },
    );
    return response.data;
  },
};

export const projectSemanticAssetPackageExport = withAsyncArtifactLifecycle(assetPackageExportCommand, {
  preflightOutput: ({ output, force }) => preflightAssetPackageOutput({ output, force }),
  materialize: materializeProjectSemanticAssetPackage,
});
