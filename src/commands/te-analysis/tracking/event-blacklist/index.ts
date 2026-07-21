import type { Command } from '../../../../framework/types.js';
import { trackingEventBlacklistList } from './list.js';
import { trackingEventBlacklistAdd } from './add.js';
import { trackingEventBlacklistUpdate } from './update.js';

const commands: Command[] = [
  trackingEventBlacklistList,
  trackingEventBlacklistAdd,
  trackingEventBlacklistUpdate,
];

export default commands;
export { trackingEventBlacklistList };
export { trackingEventBlacklistAdd };
export { trackingEventBlacklistUpdate };
