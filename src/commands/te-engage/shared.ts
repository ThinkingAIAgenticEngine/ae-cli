import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig as CoreCapabilityCommandConfig,
} from '../../core/capability-command.js';

type EngageCapabilityCommandConfig = Omit<CoreCapabilityCommandConfig, 'cliService' | 'gatewayDomain'>;

function createEngageCapabilityCommand(
  cliService:
    | 'engage-flow'
    | 'engage-task'
    | 'engage-setting'
    | 'engage-scene'
    | 'engage-activity'
    | 'engage-workbench'
    | 'engage-query',
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

/** Creates an engage-scene (配置中心/场景管理) capability gateway command. */
export function createEngageSceneCapabilityCommand(config: EngageCapabilityCommandConfig) {
  return createEngageCapabilityCommand('engage-scene', config);
}

/** Creates an engage-activity (运营活动) capability gateway command. */
export function createEngageActivityCapabilityCommand(config: EngageCapabilityCommandConfig) {
  return createEngageCapabilityCommand('engage-activity', config);
}

/** Creates an engage-workbench (工作台) capability gateway command. */
export function createEngageWorkbenchCapabilityCommand(config: EngageCapabilityCommandConfig) {
  return createEngageCapabilityCommand('engage-workbench', config);
}

/** Creates an engage-query lifecycle capability gateway command. */
export function createEngageQueryCapabilityCommand(config: EngageCapabilityCommandConfig) {
  return createEngageCapabilityCommand('engage-query', config);
}
