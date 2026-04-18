import type { Command } from '../../../framework/types.js';
import { addApprover } from './add-approver.js';
import { addChannel } from './add-channel.js';
import { approverList } from './approver-list.js';
import { cancelQueryByRequestId } from './cancel-query-by-request-id.js';
import { channelDetail } from './channel-detail.js';
import { channelList } from './channel-list.js';
import { configChannelDetail } from './config-channel-detail.js';
import { configChannelList } from './config-channel-list.js';
import { deleteChannel } from './delete-channel.js';
import { deleteConfigChannel } from './delete-config-channel.js';
import { updateChannelStatus } from './update-channel-status.js';
import { updateConfigChannelStatus } from './update-config-channel-status.js';
import { whitelistList } from './whitelist-list.js';

const commands: Command[] = [
  channelList,
  channelDetail,
  updateChannelStatus,
  deleteChannel,
  addChannel,
  whitelistList,
  addApprover,
  approverList,
  cancelQueryByRequestId,
  configChannelDetail,
  configChannelList,
  deleteConfigChannel,
  updateConfigChannelStatus,
];

export default commands;
