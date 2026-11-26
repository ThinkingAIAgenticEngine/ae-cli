import { withAsyncArtifactLifecycle } from '../../../core/analysis-async-artifact.js';
import {
  dryRunCapabilityWithEnvelope,
  executeCapabilityWithEnvelope,
  validateCapabilityWithEnvelope,
} from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';
import { withOutputMetadata } from '../../../framework/output.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { materializeProjectSemanticAssetPackage, preflightAssetPackageOutput } from './materializer.js';

const ASSET_PACKAGE_EXPORT_CAPABILITY = 'business_semantics.asset_package.export';
const ASSET_SCOPES = new Set(['governed', 'collaborative', 'all_visible', 'certified', 'frequent', 'all', 'specified']);
const GATEWAY_DOMAIN = 'analysis';

function assetScope(ctx: RuntimeContext): string {
  const value = ctx.str('asset-scope') || 'governed';
  if (!ASSET_SCOPES.has(value)) {
    throw new Error(
      'asset-scope must be one of: governed, collaborative, all_visible, certified, frequent, all, specified',
    );
  }
  return value;
}

export function buildAssetPackageInput(ctx: RuntimeContext) {
  const scope = assetScope(ctx);
  const refs: unknown = ctx.json('asset-refs');
  if (scope === 'specified') {
    if (!Array.isArray(refs) || refs.length < 1 || refs.length > 1000)
      throw new Error('specified scope requires 1 to 1000 asset-refs.');
    const seen = new Set<string>();
    for (const ref of refs) {
      if (
        !ref ||
        typeof ref !== 'object' ||
        Array.isArray(ref) ||
        Object.keys(ref).length !== 2 ||
        !['dashboard', 'report', 'metric', 'event', 'event_prop', 'user_prop', 'user_tag', 'user_cluster'].includes(
          ref.resource_type,
        ) ||
        typeof ref.resource_key !== 'string' ||
        !ref.resource_key.trim()
      )
        throw new Error('Each asset reference requires a supported resource_type and a non-empty string resource_key.');
      const key = `${ref.resource_type}:${ref.resource_key}`;
      if (seen.has(key)) throw new Error('Duplicate asset reference.');
      seen.add(key);
    }
  } else if (refs !== undefined && refs !== null) throw new Error('asset-refs is only supported for specified scope.');
  return {
    project_id: ctx.num('project-id'),
    asset_scope: scope,
    ...(refs ? { asset_refs: refs } : {}),
  };
}

const assetPackageExportCommand: Command = {
  service: 'project-semantic',
  resource: 'asset-package',
  command: 'export',
  description: 'Export and materialize a knowledge-ready project asset package for CLI Agent consumption.',
  helpText:
    'Requires access to the target project. Explicit asset-package export is independent of automatic knowledge-base discovery.',
  flags: [
    {
      name: 'project-id',
      type: 'number',
      required: true,
      desc: 'Numeric project ID.',
      alias: 'p',
      min: 1,
    },
    {
      name: 'asset-scope',
      type: 'string',
      required: false,
      desc: 'Legacy scopes: governed (default), collaborative, all_visible. Manager setup scopes: certified, frequent (positive 90-day query count, ranked), all, specified.',
    },
    {
      name: 'asset-refs',
      type: 'json',
      desc: 'Exact [{resource_type,resource_key}] references for specified scope; JSON or @file. Keys must be strings.',
    },
  ],
  risk: 'read',
  validateInput: (ctx) =>
    validateCapabilityWithEnvelope(
      ctx.host(),
      resolveGatewayDomain(GATEWAY_DOMAIN, GATEWAY_DOMAIN),
      ASSET_PACKAGE_EXPORT_CAPABILITY,
      buildAssetPackageInput(ctx),
    ).then((response) => withOutputMetadata(response.data, response.meta)),
  dryRun: (ctx) =>
    dryRunCapabilityWithEnvelope(
      ctx.host(),
      resolveGatewayDomain(GATEWAY_DOMAIN, GATEWAY_DOMAIN),
      ASSET_PACKAGE_EXPORT_CAPABILITY,
      buildAssetPackageInput(ctx),
    ).then((response) => withOutputMetadata(response.data, response.meta)),
  execute: async (ctx) => {
    const response = await executeCapabilityWithEnvelope(
      ctx.host(),
      resolveGatewayDomain(GATEWAY_DOMAIN, GATEWAY_DOMAIN),
      ASSET_PACKAGE_EXPORT_CAPABILITY,
      buildAssetPackageInput(ctx),
    );
    return withOutputMetadata(response.data, response.meta);
  },
};

export const projectSemanticAssetPackageExport = withAsyncArtifactLifecycle(assetPackageExportCommand, {
  preflightOutput: ({ output, force }) => preflightAssetPackageOutput({ output, force }),
  materialize: materializeProjectSemanticAssetPackage,
});
