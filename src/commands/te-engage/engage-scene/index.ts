import type { Command } from '../../../framework/types.js';
import { configItemCreate } from './config-item/create.js';
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
import { configChannelCreate } from './config-channel/create.js';
import { configChannelUpdate } from './config-channel/update.js';
import { configChannelQueryLog } from './config-channel/query-log.js';
import { strategyCreate } from './strategy/create.js';
import { strategyUpdate } from './strategy/update.js';
import { strategyLog } from './strategy/log.js';
import { strategyBatchCopy } from './strategy/batch-copy.js';
// Disabled: high-risk write; use legacy engage +manage_strategy until re-enabled.
// import { strategySaveSubmit } from './strategy/save-submit.js';
// import { strategyTestSend } from './strategy/test-send.js';
import { templateList } from './template/list.js';
import { templateGet } from './template/get.js';
import { templateCreate } from './template/create.js';
import { templateUpdate } from './template/update.js';
import { templateUpdateStatus } from './template/update-status.js';
import { templateDelete } from './template/delete.js';
// import { templateTestSend } from './template/test-send.js';

const commands: Command[] = [
  configItemCreate,
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
  configChannelCreate,
  configChannelUpdate,
  configChannelQueryLog,
  strategyCreate,
  strategyUpdate,
  strategyLog,
  strategyBatchCopy,
  // strategySaveSubmit,
  // strategyTestSend,
  templateList,
  templateGet,
  templateCreate,
  templateUpdate,
  templateUpdateStatus,
  templateDelete,
  // templateTestSend,
];

export { configItemCreate } from './config-item/create.js';
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
export { configChannelCreate } from './config-channel/create.js';
export { configChannelUpdate } from './config-channel/update.js';
export { configChannelQueryLog } from './config-channel/query-log.js';
export { strategyCreate } from './strategy/create.js';
export { strategyUpdate } from './strategy/update.js';
export { strategyLog } from './strategy/log.js';
export { strategyBatchCopy } from './strategy/batch-copy.js';
// export { strategySaveSubmit } from './strategy/save-submit.js';
// export { strategyTestSend } from './strategy/test-send.js';
export { templateList } from './template/list.js';
export { templateGet } from './template/get.js';
export { templateCreate } from './template/create.js';
export { templateUpdate } from './template/update.js';
export { templateUpdateStatus } from './template/update-status.js';
export { templateDelete } from './template/delete.js';
// export { templateTestSend } from './template/test-send.js';

export default commands;
