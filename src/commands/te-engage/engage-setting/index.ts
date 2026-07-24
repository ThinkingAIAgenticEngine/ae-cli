import type { Command } from '../../../framework/types.js';
import { channelTouchLimitsList } from './channel-touch-limits/list.js';
import { channelTouchLimitsBatchUpdate } from './channel-touch-limits/batch-update.js';
import { channelTouchLimitsToggle } from './channel-touch-limits/toggle.js';
import { channelTouchLimitsSave } from './channel-touch-limits/save.js';
import { channelUpdateConfig } from './channel/update-config.js';
import { channelTestSend } from './channel/test-send.js';
import { channelList } from './channel/list.js';
import { channelGet } from './channel/get.js';
import { channelCreate } from './channel/create.js';
import { channelUpdateStatus } from './channel/update-status.js';
import { channelDelete } from './channel/delete.js';
import { approvalApproverDelete } from './approval-approver/delete.js';
import { approvalApproverAdd } from './approval-approver/add.js';
import { approvalApproverList } from './approval-approver/list.js';
import { whitelistAdd } from './whitelist/add.js';
import { whitelistUpdate } from './whitelist/update.js';
import { whitelistDelete } from './whitelist/delete.js';
import { whitelistVerify } from './whitelist/verify.js';
import { whitelistList } from './whitelist/list.js';
import { pushLanguageGet } from './push-language/get.js';
import { pushLanguageSet } from './push-language/set.js';
import { clientParamCreate } from './client-param/create.js';
import { clientParamUpdate } from './client-param/update.js';
import { clientParamDelete } from './client-param/delete.js';
import { clientParamList } from './client-param/list.js';
import { configTableUpload } from './config-table/upload.js';
import { configTableSave } from './config-table/save.js';
import { configTableList } from './config-table/list.js';
import { configTableQueryData } from './config-table/query-data.js';
import { configTableUpdateData } from './config-table/update-data.js';
import { configTableDelete } from './config-table/delete.js';
import { presetEventList } from './preset-event/list.js';
import { presetEventUpdate } from './preset-event/update.js';
import { commonMetricList } from './common-metric/list.js';
import { commonMetricGet } from './common-metric/get.js';
import { commonMetricCreate } from './common-metric/create.js';
import { commonMetricUpdate } from './common-metric/update.js';
import { commonMetricDelete } from './common-metric/delete.js';
import { queryClusterQpSkill } from './query/cluster-qp-skill.js';

const commands: Command[] = [
  channelTouchLimitsList,
  channelTouchLimitsBatchUpdate,
  channelTouchLimitsToggle,
  channelTouchLimitsSave,
  channelUpdateConfig,
  channelTestSend,
  channelList,
  channelGet,
  channelCreate,
  channelUpdateStatus,
  channelDelete,
  approvalApproverAdd,
  approvalApproverList,
  approvalApproverDelete,
  whitelistList,
  whitelistAdd,
  whitelistUpdate,
  whitelistDelete,
  whitelistVerify,
  pushLanguageGet,
  pushLanguageSet,
  clientParamCreate,
  clientParamUpdate,
  clientParamDelete,
  clientParamList,
  configTableUpload,
  configTableSave,
  configTableList,
  configTableQueryData,
  configTableUpdateData,
  configTableDelete,
  presetEventList,
  presetEventUpdate,
  commonMetricList,
  commonMetricGet,
  commonMetricCreate,
  commonMetricUpdate,
  commonMetricDelete,
  queryClusterQpSkill,
];

export { channelTouchLimitsList } from './channel-touch-limits/list.js';
export { channelTouchLimitsBatchUpdate } from './channel-touch-limits/batch-update.js';
export { channelTouchLimitsToggle } from './channel-touch-limits/toggle.js';
export { channelTouchLimitsSave } from './channel-touch-limits/save.js';
export { channelUpdateConfig } from './channel/update-config.js';
export { channelTestSend } from './channel/test-send.js';
export { channelList } from './channel/list.js';
export { channelGet } from './channel/get.js';
export { channelCreate } from './channel/create.js';
export { channelUpdateStatus } from './channel/update-status.js';
export { channelDelete } from './channel/delete.js';
export { approvalApproverAdd } from './approval-approver/add.js';
export { approvalApproverList } from './approval-approver/list.js';
export { approvalApproverDelete } from './approval-approver/delete.js';
export { whitelistList } from './whitelist/list.js';
export { whitelistAdd } from './whitelist/add.js';
export { whitelistUpdate } from './whitelist/update.js';
export { whitelistDelete } from './whitelist/delete.js';
export { whitelistVerify } from './whitelist/verify.js';
export { pushLanguageGet } from './push-language/get.js';
export { pushLanguageSet } from './push-language/set.js';
export { clientParamCreate } from './client-param/create.js';
export { clientParamUpdate } from './client-param/update.js';
export { clientParamDelete } from './client-param/delete.js';
export { clientParamList } from './client-param/list.js';
export { configTableUpload } from './config-table/upload.js';
export { configTableSave } from './config-table/save.js';
export { configTableList } from './config-table/list.js';
export { configTableQueryData } from './config-table/query-data.js';
export { configTableUpdateData } from './config-table/update-data.js';
export { configTableDelete } from './config-table/delete.js';
export { presetEventList } from './preset-event/list.js';
export { presetEventUpdate } from './preset-event/update.js';
export { commonMetricList } from './common-metric/list.js';
export { commonMetricGet } from './common-metric/get.js';
export { commonMetricCreate } from './common-metric/create.js';
export { commonMetricUpdate } from './common-metric/update.js';
export { commonMetricDelete } from './common-metric/delete.js';
export { queryClusterQpSkill } from './query/cluster-qp-skill.js';

export default commands;
