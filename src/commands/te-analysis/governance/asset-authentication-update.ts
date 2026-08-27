import type { Flag } from '../../../framework/types.js';
import {
  compactInput,
  createAnalysisGovernanceCapabilityCommand,
  optionalString,
  projectIdFlag,
  requestIdFlag,
} from '../capability-shared.js';
import { assetRefsInput } from './asset-authentication-shared.js';

const authenticationStatusFlag: Flag = {
  name: 'authentication-status', type: 'number', required: true,
  desc: 'Target authentication status: 1 authenticates and 0 revokes.', min: 0, max: 1,
};
const assetRefsFlag: Flag = {
  name: 'asset-refs', type: 'json', required: false,
  desc: 'Inline JSON array of {resource_type,resource_key} asset references.',
};
const assetFileFlag: Flag = {
  name: 'asset-file', type: 'string', required: false,
  desc: 'JSONL file whose rows contain resource_type and resource_key.',
};
const assetTypeFlag: Flag = {
  name: 'asset-type', type: 'string', required: false,
  desc: 'Convenience asset type used together with --asset-ids.',
};
const assetIdsFlag: Flag = {
  name: 'asset-ids', type: 'json', required: false,
  desc: 'Convenience JSON array of business keys used together with --asset-type.',
};
const expectedSnapshotHashFlag: Flag = {
  name: 'expected-snapshot-hash', type: 'string', required: false,
  desc: 'Optional snapshot_hash from the export sidecar. A mismatch rejects the whole update.',
};

export const analysisGovernanceAssetAuthenticationUpdate = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-authentication',
  command: 'update',
  capabilityId: 'governance.asset_authentication.update',
  description: 'Batch update explicit typed asset references.',
  flags: [
    projectIdFlag,
    authenticationStatusFlag,
    assetRefsFlag,
    assetFileFlag,
    assetTypeFlag,
    assetIdsFlag,
    expectedSnapshotHashFlag,
    requestIdFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    authentication_status: ctx.num('authentication-status'),
    asset_refs: assetRefsInput(ctx),
    expected_snapshot_hash: optionalString(ctx, 'expected-snapshot-hash'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});
