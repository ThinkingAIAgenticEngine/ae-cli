import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataExchangeRateRefresh = createAnalysisMetaCapabilityCommand({
  resource: 'exchange',
  command: 'rate-refresh',
  capabilityId: 'metadata.exchange_rate.refresh',
  description: 'Refresh exchange-rate data manually.',
  flags: [
    projectIdFlag,
  ],
  risk: 'write',
  buildInput: projectInput,
});
