import type { Command } from '../../../framework/types.js';
import { configItemCreate } from './config-item/create.js';
import { configItemDelete } from './config-item/delete.js';
import { configItemGet } from './config-item/get.js';
import { configItemList } from './config-item/list.js';
import { configItemUpdate } from './config-item/update.js';
import { configParamList } from './config-param/list.js';
import { configParamBatchAdd } from './config-param/batch-add.js';
import { configParamUpdate } from './config-param/update.js';
import { configParamBatchDelete } from './config-param/batch-delete.js';
import { configGroupList } from './config-group/list.js';
import { configGroupBatchAdd } from './config-group/batch-add.js';
import { configGroupUpdate } from './config-group/update.js';
import { configGroupBatchDelete } from './config-group/batch-delete.js';
import { presetMetricGet } from './preset-metric/get.js';
import { presetMetricSet } from './preset-metric/set.js';
import { configMetricList } from './config-metric/list.js';
import { configMetricGet } from './config-metric/get.js';
import { configMetricBatchAdd } from './config-metric/batch-add.js';
import { configMetricUpdateRule } from './config-metric/update-rule.js';
import { configMetricBatchDelete } from './config-metric/batch-delete.js';
import { configChannelList } from './config-channel/list.js';
import { configChannelGet } from './config-channel/get.js';
import { configChannelCreate } from './config-channel/create.js';
import { configChannelUpdate } from './config-channel/update.js';
import { configChannelUpdateStatus } from './config-channel/update-status.js';
import { configChannelDelete } from './config-channel/delete.js';
import { configChannelQueryLog } from './config-channel/query-log.js';
import { strategyCreate } from './strategy/create.js';
import { strategyGet } from './strategy/get.js';
import { strategyList } from './strategy/list.js';
import { strategyManage } from './strategy/manage.js';
import { strategyUpdate } from './strategy/update.js';
import { strategyLog } from './strategy/log.js';
import { strategyBatchCopy } from './strategy/batch-copy.js';
// Disabled pending separate admission of these high-impact commands.
// import { strategySaveSubmit } from './strategy/save-submit.js';
// import { strategyTestSend } from './strategy/test-send.js';
import { templateList } from './template/list.js';
import { templateGet } from './template/get.js';
import { templateCreate } from './template/create.js';
import { templateCopy } from './template/copy.js';
import { templateUpdate } from './template/update.js';
import { templateUpdateStatus } from './template/update-status.js';
import { templateDelete } from './template/delete.js';
// import { templateTestSend } from './template/test-send.js';

const commands: Command[] = [
  configItemCreate,
  configItemDelete,
  configItemGet,
  configItemList,
  configItemUpdate,
  configParamList,
  configParamBatchAdd,
  configParamUpdate,
  configParamBatchDelete,
  configGroupList,
  configGroupBatchAdd,
  configGroupUpdate,
  configGroupBatchDelete,
  presetMetricGet,
  presetMetricSet,
  configMetricList,
  configMetricGet,
  configMetricBatchAdd,
  configMetricUpdateRule,
  configMetricBatchDelete,
  configChannelList,
  configChannelGet,
  configChannelCreate,
  configChannelUpdate,
  configChannelUpdateStatus,
  configChannelDelete,
  configChannelQueryLog,
  strategyCreate,
  strategyGet,
  strategyList,
  strategyManage,
  strategyUpdate,
  strategyLog,
  strategyBatchCopy,
  // strategySaveSubmit,
  // strategyTestSend,
  templateList,
  templateCopy,
  templateGet,
  templateCreate,
  templateUpdate,
  templateUpdateStatus,
  templateDelete,
  // templateTestSend,
];

export { configItemCreate } from './config-item/create.js';
export { configItemDelete } from './config-item/delete.js';
export { configItemGet } from './config-item/get.js';
export { configItemList } from './config-item/list.js';
export { configItemUpdate } from './config-item/update.js';
export { configParamList } from './config-param/list.js';
export { configParamBatchAdd } from './config-param/batch-add.js';
export { configParamUpdate } from './config-param/update.js';
export { configParamBatchDelete } from './config-param/batch-delete.js';
export { configGroupList } from './config-group/list.js';
export { configGroupBatchAdd } from './config-group/batch-add.js';
export { configGroupUpdate } from './config-group/update.js';
export { configGroupBatchDelete } from './config-group/batch-delete.js';
export { presetMetricGet } from './preset-metric/get.js';
export { presetMetricSet } from './preset-metric/set.js';
export { configMetricList } from './config-metric/list.js';
export { configMetricGet } from './config-metric/get.js';
export { configMetricBatchAdd } from './config-metric/batch-add.js';
export { configMetricUpdateRule } from './config-metric/update-rule.js';
export { configMetricBatchDelete } from './config-metric/batch-delete.js';
export { configChannelList } from './config-channel/list.js';
export { configChannelGet } from './config-channel/get.js';
export { configChannelCreate } from './config-channel/create.js';
export { configChannelUpdate } from './config-channel/update.js';
export { configChannelUpdateStatus } from './config-channel/update-status.js';
export { configChannelDelete } from './config-channel/delete.js';
export { configChannelQueryLog } from './config-channel/query-log.js';
export { strategyCreate } from './strategy/create.js';
export { strategyGet } from './strategy/get.js';
export { strategyList } from './strategy/list.js';
export { strategyManage } from './strategy/manage.js';
export { strategyUpdate } from './strategy/update.js';
export { strategyLog } from './strategy/log.js';
export { strategyBatchCopy } from './strategy/batch-copy.js';
// export { strategySaveSubmit } from './strategy/save-submit.js';
// export { strategyTestSend } from './strategy/test-send.js';
export { templateList } from './template/list.js';
export { templateCopy } from './template/copy.js';
export { templateGet } from './template/get.js';
export { templateCreate } from './template/create.js';
export { templateUpdate } from './template/update.js';
export { templateUpdateStatus } from './template/update-status.js';
export { templateDelete } from './template/delete.js';
// export { templateTestSend } from './template/test-send.js';

export default commands;
