import type { Command } from '../../../framework/types.js';
import { channelTouchLimitsList } from './channel-touch-limits/list.js';

const commands: Command[] = [channelTouchLimitsList];

export { channelTouchLimitsList } from './channel-touch-limits/list.js';

export default commands;
