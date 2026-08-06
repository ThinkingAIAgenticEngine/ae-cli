import type { Command } from '../../../framework/types.js';
import { flowUpdateRemark } from './flow/update-remark.js';
import { flowDelete } from './flow/delete.js';
import { flowGet } from './flow/get.js';
import { flowList } from './flow/list.js';
import { flowManage } from './flow/manage.js';
import { flowModifyBaseInfo } from './flow/modify-base-info.js';
import { flowSave } from './flow/save.js';
import { flowMetricUpdate } from './metric/update.js';
import { nodeConfigSchema } from './node-config/schema.js';
import { nodeConfigValidate } from './node-config/validate.js';
import { metricUserExport } from './metric-user/export.js';
import { metricUserRun } from './metric-user/run.js';
import { nodeMetricUserExport } from './node-metric-user/export.js';
import { nodeMetricUserRun } from './node-metric-user/run.js';
import { nodeUserExport } from './node-user/export.js';
import { nodeUserRun } from './node-user/run.js';
import { operationLogQuery } from './operation-log/query.js';
import { flowReportMetricDetailExport } from './report/metric-detail-export.js';
import { flowReportMetricDetailRun } from './report/metric-detail-run.js';
// Temporarily disabled: testing issues — re-enable with skill docs when fixed.
// import { testRun } from './test/run.js';
import { versionList } from './version/list.js';

const commands: Command[] = [
  flowList,
  flowGet,
  flowSave,
  nodeConfigSchema,
  nodeConfigValidate,
  flowMetricUpdate,
  flowModifyBaseInfo,
  flowManage,
  flowDelete,
  flowReportMetricDetailRun,
  flowReportMetricDetailExport,
  metricUserRun,
  metricUserExport,
  nodeUserRun,
  nodeUserExport,
  nodeMetricUserRun,
  nodeMetricUserExport,
  operationLogQuery,
  // testRun,
  versionList,
  flowUpdateRemark,
];

export { flowUpdateRemark } from './flow/update-remark.js';
export { flowDelete } from './flow/delete.js';
export { flowGet } from './flow/get.js';
export { flowList } from './flow/list.js';
export { flowManage } from './flow/manage.js';
export { flowModifyBaseInfo } from './flow/modify-base-info.js';
export { flowSave } from './flow/save.js';
export { flowMetricUpdate } from './metric/update.js';
export { nodeConfigSchema } from './node-config/schema.js';
export { nodeConfigValidate } from './node-config/validate.js';
export { metricUserExport } from './metric-user/export.js';
export { metricUserRun } from './metric-user/run.js';
export { nodeMetricUserExport } from './node-metric-user/export.js';
export { nodeMetricUserRun } from './node-metric-user/run.js';
export { nodeUserExport } from './node-user/export.js';
export { nodeUserRun } from './node-user/run.js';
export { operationLogQuery } from './operation-log/query.js';
export { flowReportMetricDetailExport } from './report/metric-detail-export.js';
export { flowReportMetricDetailRun } from './report/metric-detail-run.js';
// export { testRun } from './test/run.js';
export { versionList } from './version/list.js';

export default commands;
