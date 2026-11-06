import { readCommands } from './read.js';
import type { Command } from '../../framework/types.js';
import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';
import { traceGet } from './trace/get.js';
import { traceList } from './trace/list.js';
import { traceCount } from './trace/count.js';
import { platformList } from './platform/list.js';
import { conversationList } from './conversation/list.js';
import { conversationCount } from './conversation/count.js';
import { conversationGet } from './conversation/get.js';

registerCapabilityGatewayRoute('ai-monitor', {
  gatewayDomain: 'ai-monitor',
  capabilityPrefixes: ['ai_monitor.'],
});

const commands: Command[] = [platformList, traceList, traceCount, traceGet, conversationList, conversationCount, conversationGet, ...readCommands];

export { platformList, traceCount, traceGet, traceList, conversationList, conversationCount, conversationGet };
export { readCommands };
export default commands;
