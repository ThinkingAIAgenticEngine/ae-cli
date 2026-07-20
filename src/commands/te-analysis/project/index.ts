import type { Command } from '../../../framework/types.js';
import accessDetail from './access-detail/index.js';
import dataPower from './data-power/index.js';
import entity from './entity/index.js';
import entityEvent from './entity-event/index.js';
import projectFunction from './function/index.js';
import info from './info/index.js';
import markTime from './mark-time/index.js';
import member from './member/index.js';
import memberCandidate from './member-candidate/index.js';
import memberHandover from './member-handover/index.js';
import memberReceiver from './member-receiver/index.js';
import owner from './owner/index.js';
import permissionBinding from './permission-binding/index.js';
import receiveStatus from './receive-status/index.js';
import role from './role/index.js';
import roleFunction from './role-function/index.js';
import roleUser from './role-user/index.js';
import timezone from './timezone/index.js';
import userIdItems from './user-id-items/index.js';

const commands: Command[] = [
  ...accessDetail,
  ...dataPower,
  ...entity,
  ...entityEvent,
  ...projectFunction,
  ...info,
  ...markTime,
  ...member,
  ...memberCandidate,
  ...memberHandover,
  ...memberReceiver,
  ...owner,
  ...permissionBinding,
  ...receiveStatus,
  ...role,
  ...roleFunction,
  ...roleUser,
  ...timezone,
  ...userIdItems,
];

export default commands;
