import type { Command } from '../../../framework/types.js';
import { flowUpdateRemark } from './flow/update-remark.js';
import { flowDelete } from './flow/delete.js';
import { flowGet } from './flow/get.js';
import { flowList } from './flow/list.js';
import { flowManage } from './flow/manage.js';
import { flowModifyBaseInfo } from './flow/modify-base-info.js';
import { flowSave } from './flow/save.js';
import { nodeConfigSchema } from './node-config/schema.js';
import { nodeConfigValidate } from './node-config/validate.js';
import { operationLogQuery } from './operation-log/query.js';
// Temporarily disabled: testing issues — re-enable with skill docs when fixed.
// import { testRun } from './test/run.js';
import { versionList } from './version/list.js';

const commands: Command[] = [
  flowList,
  flowGet,
  flowSave,
  nodeConfigSchema,
  nodeConfigValidate,
  flowModifyBaseInfo,
  flowManage,
  flowDelete,
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
export { nodeConfigSchema } from './node-config/schema.js';
export { nodeConfigValidate } from './node-config/validate.js';
export { operationLogQuery } from './operation-log/query.js';
// export { testRun } from './test/run.js';
export { versionList } from './version/list.js';

export default commands;
