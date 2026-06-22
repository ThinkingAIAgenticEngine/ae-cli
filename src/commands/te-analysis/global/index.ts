import type { Command } from '../../../framework/types.js';
import { listQueryClusters } from './list-query-clusters.js';

const commands: Command[] = [
  listQueryClusters,
];

export default commands;
export { listQueryClusters };
