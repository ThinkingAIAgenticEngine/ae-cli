import type { Command } from '../../framework/types.js';
import { registerMcpMappings } from '../../core/mcp.js';
import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';
import engageFlow from './engage-flow/index.js';
import engageSetting from './engage-setting/index.js';
import engageTask from './engage-task/index.js';
import config from './config/index.js';
import flow from './flow/index.js';
import setting from './setting/index.js';
import task from './task/index.js';

registerCapabilityGatewayRoute('engage-flow', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-task', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-setting', { gatewayDomain: 'engage' });

registerMcpMappings({
  'engage_config': { componentName: 'engage', mappingPath: 'config' },
  'engage_flow': { componentName: 'engage', mappingPath: 'flow' },
  'engage_setting': { componentName: 'engage', mappingPath: 'setting' },
  'engage_task': { componentName: 'engage', mappingPath: 'task' },
});

const commands: Command[] = [
  ...setting,
  ...task,
  ...config,
  ...flow,
  ...engageFlow,
  ...engageTask,
  ...engageSetting,
];

export default commands;
