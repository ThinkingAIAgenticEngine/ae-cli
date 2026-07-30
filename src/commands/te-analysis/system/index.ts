import type { Command } from '../../../framework/types.js';
import { systemConfigurationCommands } from './configuration.js';
import { systemIdentityCommands } from './identity.js';
import { systemMonitoringCommands } from './monitoring.js';
import { systemSecurityCommands } from './security.js';
import { systemUsageCommands } from './usage.js';

const commands: Command[] = [
  ...systemUsageCommands,
  ...systemIdentityCommands,
  ...systemSecurityCommands,
  ...systemMonitoringCommands,
  ...systemConfigurationCommands,
];

export default commands;
