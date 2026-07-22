import type { Command } from '../../../framework/types.js';
import { activityCreate } from './activity/create.js';
import { activityUpdate } from './activity/update.js';
import { activityDelete } from './activity/delete.js';
import { activityList } from './activity/list.js';
import { activityGet } from './activity/get.js';
import { activityPause } from './activity/pause.js';
import { activityEnd } from './activity/end.js';
import { activityStats } from './activity/stats.js';
import { activityInfoList } from './activity/info-list.js';
// Temporarily disabled: testing issues — re-enable with skill docs when fixed.
// import { approvalSubmit } from './approval/submit.js';
import { approvalApprove } from './approval/approve.js';
import { approvalReject } from './approval/reject.js';
import { approvalCancel } from './approval/cancel.js';
import { topicCreate } from './topic/create.js';
import { topicUpdate } from './topic/update.js';
import { topicRemoveTask } from './topic/remove-task.js';
import { topicDelete } from './topic/delete.js';
import { topicGet } from './topic/get.js';
import { topicCopy } from './topic/copy.js';
import { activityTypeList } from './activity-type/list.js';
import { activityTypeBatchAdd } from './activity-type/batch-add.js';
import { activityTypeUpdate } from './activity-type/update.js';
import { activityTypeBatchDelete } from './activity-type/batch-delete.js';
import { taskGet } from './task/get.js';
import { taskCreate } from './task/create.js';
import { taskUpdate } from './task/update.js';
import { taskCopy } from './task/copy.js';

const commands: Command[] = [
  activityCreate,
  activityUpdate,
  activityDelete,
  activityList,
  activityGet,
  activityPause,
  activityEnd,
  activityStats,
  activityInfoList,
  // approvalSubmit,
  approvalApprove,
  approvalReject,
  approvalCancel,
  topicCreate,
  topicUpdate,
  topicRemoveTask,
  topicDelete,
  topicGet,
  topicCopy,
  activityTypeList,
  activityTypeBatchAdd,
  activityTypeUpdate,
  activityTypeBatchDelete,
  taskGet,
  taskCreate,
  taskUpdate,
  taskCopy,
];

export { activityCreate } from './activity/create.js';
export { activityUpdate } from './activity/update.js';
export { activityDelete } from './activity/delete.js';
export { activityList } from './activity/list.js';
export { activityGet } from './activity/get.js';
export { activityPause } from './activity/pause.js';
export { activityEnd } from './activity/end.js';
export { activityStats } from './activity/stats.js';
export { activityInfoList } from './activity/info-list.js';
// export { approvalSubmit } from './approval/submit.js';
export { approvalApprove } from './approval/approve.js';
export { approvalReject } from './approval/reject.js';
export { approvalCancel } from './approval/cancel.js';
export { topicCreate } from './topic/create.js';
export { topicUpdate } from './topic/update.js';
export { topicRemoveTask } from './topic/remove-task.js';
export { topicDelete } from './topic/delete.js';
export { topicGet } from './topic/get.js';
export { topicCopy } from './topic/copy.js';
export { activityTypeList } from './activity-type/list.js';
export { activityTypeBatchAdd } from './activity-type/batch-add.js';
export { activityTypeUpdate } from './activity-type/update.js';
export { activityTypeBatchDelete } from './activity-type/batch-delete.js';
export { taskGet } from './task/get.js';
export { taskCreate } from './task/create.js';
export { taskUpdate } from './task/update.js';
export { taskCopy } from './task/copy.js';

export default commands;
