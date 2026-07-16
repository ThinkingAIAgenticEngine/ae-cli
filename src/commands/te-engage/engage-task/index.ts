import type { Command } from '../../../framework/types.js';
import { channelRefStats } from './channel-ref/stats.js';
import { groupCreate } from './group/create.js';
// import { groupDelete } from './group/delete.js'; // temporarily disabled
import { groupList } from './group/list.js';
import { groupUpdate } from './group/update.js';
import { metricList } from './metric/list.js';
import { metricUpdate } from './metric/update.js';
import { operationLogQuery } from './operation-log/query.js';
import { opsDelete } from './ops/delete.js';
import { opsModifyGroup } from './ops/modify-group.js';
// import { opsSubmitApproval } from './ops/submit-approval.js'; // temporarily disabled
import { pushRecordQuery } from './push-record/query.js';
// import { raceRelease } from './race/release.js'; // temporarily disabled
import { segmentListGet } from './segment-list/get.js';
import { segmentListQuery } from './segment-list/query.js';
import { segmentListRename } from './segment-list/rename.js';
// import { segmentListSetVisibility } from './segment-list/set-visibility.js'; // temporarily disabled

const commands: Command[] = [
  channelRefStats,
  groupCreate,
  // groupDelete, // temporarily disabled: ae-cli engage-task group delete
  groupList,
  groupUpdate,
  metricList,
  metricUpdate,
  operationLogQuery,
  opsDelete,
  opsModifyGroup,
  // opsSubmitApproval, // temporarily disabled: ae-cli engage-task ops submit-approval
  pushRecordQuery,
  // raceRelease, // temporarily disabled: ae-cli engage-task race release
  segmentListGet,
  segmentListQuery,
  segmentListRename,
  // segmentListSetVisibility, // temporarily disabled: ae-cli engage-task segment-list set-visibility
];

export { channelRefStats } from './channel-ref/stats.js';
export { groupCreate } from './group/create.js';
// export { groupDelete } from './group/delete.js'; // temporarily disabled
export { groupList } from './group/list.js';
export { groupUpdate } from './group/update.js';
export { metricList } from './metric/list.js';
export { metricUpdate } from './metric/update.js';
export { operationLogQuery } from './operation-log/query.js';
export { opsDelete } from './ops/delete.js';
export { opsModifyGroup } from './ops/modify-group.js';
// export { opsSubmitApproval } from './ops/submit-approval.js'; // temporarily disabled
export { pushRecordQuery } from './push-record/query.js';
// export { raceRelease } from './race/release.js'; // temporarily disabled
export { segmentListGet } from './segment-list/get.js';
export { segmentListQuery } from './segment-list/query.js';
export { segmentListRename } from './segment-list/rename.js';
// export { segmentListSetVisibility } from './segment-list/set-visibility.js'; // temporarily disabled

export default commands;
