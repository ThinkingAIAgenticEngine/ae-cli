import type { Command } from '../../framework/types.js';
import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';
import engageFlow from './engage-flow/index.js';
import engageSetting from './engage-setting/index.js';
import engageScene from './engage-scene/index.js';
import engageActivity from './engage-activity/index.js';
import engageWorkbench from './engage-workbench/index.js';
import engageTask from './engage-task/index.js';
import engageQuery from './engage-query/index.js';

registerCapabilityGatewayRoute('engage-flow', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-task', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-setting', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-scene', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-activity', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-workbench', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-query', { gatewayDomain: 'engage' });

const commands: Command[] = [
  ...engageFlow,
  ...engageTask,
  ...engageSetting,
  ...engageScene,
  ...engageActivity,
  ...engageWorkbench,
  ...engageQuery,
];

export default commands;
