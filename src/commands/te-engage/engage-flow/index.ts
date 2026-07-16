import type { Command } from '../../../framework/types.js';
import { operationLogQuery } from './operation-log/query.js';
// import { testRun } from './test/run.js'; // temporarily disabled
import { versionList } from './version/list.js';

const commands: Command[] = [
  operationLogQuery,
  // testRun, // temporarily disabled: ae-cli engage-flow test run
  versionList,
];

export { operationLogQuery } from './operation-log/query.js';
// export { testRun } from './test/run.js'; // temporarily disabled
export { versionList } from './version/list.js';

export default commands;
