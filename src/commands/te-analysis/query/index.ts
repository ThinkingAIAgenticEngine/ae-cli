import type { Command } from '../../../framework/types.js';
import { queryCancel } from './cancel.js';
import { queryCreateResultCluster } from './create-result-cluster.js';

const commands: Command[] = [
  queryCancel,
  queryCreateResultCluster,
];

export default commands;
export { queryCancel };
export { queryCreateResultCluster };
