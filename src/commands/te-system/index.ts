/**
 * AE system administration commands.
 *
 * Transitional L2 transport:
 * - Maintainer: te-agent /api/admin routes and this module.
 * - Migration target: system Capability Gateway.
 * - Review date: 2026-10-24.
 * - Exit condition: migrate commands once equivalent gateway schemas, auth,
 *   risk, dry-run, and output contracts are stable.
 */

import type { Command } from '../../framework/types.js';
import { memberCommands } from './members.js';
import { sandboxCommands } from './sandboxes.js';
import { modelCommands } from './models.js';
import { usageCommands } from './usage.js';
import { costControlCommands } from './cost-control.js';
import { channelCommands } from './channels.js';
import { channelRoutingCommands } from './channel-routing.js';
import { channelWhatsAppCommands } from './channel-whatsapp.js';
import { channelBindingCommands } from './channel-bindings.js';
import { sandboxToolCommands } from './sandbox-tools.js';

const commands: Command[] = [
  ...memberCommands,
  ...sandboxCommands,
  ...modelCommands,
  ...usageCommands,
  ...costControlCommands,
  ...channelCommands,
  ...channelRoutingCommands,
  ...channelWhatsAppCommands,
  ...channelBindingCommands,
  ...sandboxToolCommands,
];

export default commands;
