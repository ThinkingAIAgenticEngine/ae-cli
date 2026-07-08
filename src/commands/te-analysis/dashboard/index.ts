import type { Command } from '../../../framework/types.js';
import { dashboardList } from './list.js';
import { dashboardCreate } from './create.js';
import { dashboardGet } from './get.js';
import { dashboardUpdate } from './update.js';
import { dashboardShareInfo } from './share-info.js';
import { dashboardShare } from './share.js';
import { dashboardDelete } from './delete.js';
import { dashboardHandover } from './handover.js';
import { dashboardCopy } from './copy.js';
import { dashboardFreeze } from './freeze.js';
import { dashboardAbnormalGet } from './abnormal-get.js';
import { dashboardTaskStatus } from './task-status.js';

const commands: Command[] = [
  dashboardList,
  dashboardCreate,
  dashboardGet,
  dashboardUpdate,
  dashboardShareInfo,
  dashboardShare,
  dashboardDelete,
  dashboardHandover,
  dashboardCopy,
  dashboardFreeze,
  dashboardAbnormalGet,
  dashboardTaskStatus,
];

export default commands;
export { dashboardList };
export { dashboardCreate };
export { dashboardGet };
export { dashboardUpdate };
export { dashboardShareInfo };
export { dashboardShare };
export { dashboardDelete };
export { dashboardHandover };
export { dashboardCopy };
export { dashboardFreeze };
export { dashboardAbnormalGet };
export { dashboardTaskStatus };
