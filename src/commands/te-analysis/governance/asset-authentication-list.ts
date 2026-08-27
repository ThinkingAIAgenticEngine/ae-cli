import {
  compactInput,
  createAnalysisGovernanceCapabilityCommand,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalNumber,
  projectIdFlag,
} from '../capability-shared.js';
import {
  authenticationFilterFlags,
  authenticationFilterInput,
  validateAuthenticationFilters,
} from './asset-authentication-shared.js';

export const analysisGovernanceAssetAuthenticationList = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-authentication',
  command: 'list',
  capabilityId: 'governance.asset_authentication.list',
  description: 'Preview asset authentication with server-side filtering, sorting, and pagination.',
  flags: [projectIdFlag, ...authenticationFilterFlags, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  validate: validateAuthenticationFilters,
  buildInput: (ctx) => compactInput({
    ...authenticationFilterInput(ctx),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
