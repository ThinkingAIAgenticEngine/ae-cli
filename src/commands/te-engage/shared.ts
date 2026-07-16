import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig as CoreCapabilityCommandConfig,
} from '../../core/capability-command.js';

type EngageCapabilityCommandConfig = Omit<CoreCapabilityCommandConfig, 'cliService' | 'gatewayDomain'>;

function createEngageCapabilityCommand(
  cliService: 'engage-flow' | 'engage-task' | 'engage-setting',
  config: EngageCapabilityCommandConfig,
) {
  return createCapabilityCommandCore({
    ...config,
    cliService,
    gatewayDomain: 'engage',
  });
}

/** Creates an engage-flow capability gateway command. */
export function createEngageFlowCapabilityCommand(config: EngageCapabilityCommandConfig) {
  return createEngageCapabilityCommand('engage-flow', config);
}

/** Creates an engage-task capability gateway command. */
export function createEngageTaskCapabilityCommand(config: EngageCapabilityCommandConfig) {
  return createEngageCapabilityCommand('engage-task', config);
}

/** Creates an engage-setting capability gateway command. */
export function createEngageSettingCapabilityCommand(config: EngageCapabilityCommandConfig) {
  return createEngageCapabilityCommand('engage-setting', config);
}
