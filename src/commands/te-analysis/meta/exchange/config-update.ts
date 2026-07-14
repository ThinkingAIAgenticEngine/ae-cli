import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataExchangeConfigUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'exchange',
  command: 'config-update',
  capabilityId: 'metadata.exchange_config.update',
  description: 'Update exchange-rate configuration switch or value.',
  flags: [
    projectIdFlag,
    { name: 'config-val', type: 'string', required: true, desc: 'Exchange-rate configuration value.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), config_val: ctx.str('config-val') }),
});
