import type { Command } from '../../../framework/types.js';
import { channelRefStats } from './channel-ref/stats.js';
import { groupCreate } from './group/create.js';
import { groupDelete } from './group/delete.js';
import { groupList } from './group/list.js';
import { groupUpdate } from './group/update.js';
import { metricList } from './metric/list.js';
import { metricUpdate } from './metric/update.js';
import { operationLogQuery } from './operation-log/query.js';
import { pushRecordQuery } from './push-record/query.js';
import { raceRelease } from './race/release.js';
import { segmentListGet } from './segment-list/get.js';
import { segmentListQuery } from './segment-list/query.js';
import { segmentListRename } from './segment-list/rename.js';
import { segmentListSetVisibility } from './segment-list/set-visibility.js';
import { taskDelete } from './task/delete.js';
import { taskModifyGroup } from './task/modify-group.js';
// import { taskSubmitApproval } from './task/submit-approval.js';

const commands: Command[] = [
  channelRefStats,
  groupCreate,
  groupDelete,
  groupList,
  groupUpdate,
  metricList,
  metricUpdate,
  operationLogQuery,
  pushRecordQuery,
  raceRelease,
  segmentListGet,
  segmentListQuery,
  segmentListRename,
  segmentListSetVisibility,
  taskDelete,
  taskModifyGroup,
  // taskSubmitApproval,
];

export { channelRefStats } from './channel-ref/stats.js';
export { groupCreate } from './group/create.js';
export { groupDelete } from './group/delete.js';
export { groupList } from './group/list.js';
export { groupUpdate } from './group/update.js';
export { metricList } from './metric/list.js';
export { metricUpdate } from './metric/update.js';
export { operationLogQuery } from './operation-log/query.js';
export { pushRecordQuery } from './push-record/query.js';
export { raceRelease } from './race/release.js';
export { segmentListGet } from './segment-list/get.js';
export { segmentListQuery } from './segment-list/query.js';
export { segmentListRename } from './segment-list/rename.js';
export { segmentListSetVisibility } from './segment-list/set-visibility.js';
export { taskDelete } from './task/delete.js';
export { taskModifyGroup } from './task/modify-group.js';
// export { taskSubmitApproval } from './task/submit-approval.js';

export default commands;
