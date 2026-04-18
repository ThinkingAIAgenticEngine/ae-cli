import type { Command } from '../../framework/types.js';
import { registerMcpMappings } from '../../core/mcp.js';
import config from './config/index.js';
import flow from './flow/index.js';
import setting from './setting/index.js';
import task from './task/index.js';

registerMcpMappings({
  'engage_config': { componentName: 'engage', mappingPath: 'config' },
  'engage_flow': { componentName: 'engage', mappingPath: 'flow' },
  'engage_setting': { componentName: 'engage', mappingPath: 'setting' },
  'engage_task': { componentName: 'engage', mappingPath: 'task' },
});

const commands: Command[] = [...setting, ...task, ...config, ...flow];

export default commands;
