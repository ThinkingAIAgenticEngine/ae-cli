import {
  createAnalysisGovernanceCapabilityCommand,
  projectIdFlag,
} from '../capability-shared.js';
import {
  authenticationExportOutputFlag,
  authenticationExportPostProcess,
  authenticationFilterFlags,
  authenticationFilterInput,
  validateAuthenticationExport,
} from './asset-authentication-shared.js';

export const analysisGovernanceAssetAuthenticationExport = createAnalysisGovernanceCapabilityCommand({
  resource: 'asset-authentication',
  command: 'export',
  capabilityId: 'governance.asset_authentication.export',
  description: 'Export the complete filtered asset-authentication catalog to JSONL without pagination.',
  flags: [projectIdFlag, ...authenticationFilterFlags, authenticationExportOutputFlag],
  risk: 'read',
  validate: validateAuthenticationExport,
  buildInput: authenticationFilterInput,
  postProcess: authenticationExportPostProcess(),
});
