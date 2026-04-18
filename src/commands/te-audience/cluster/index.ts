import type { Command } from '../../../framework/types.js';
import { listClusters } from './list-clusters.js';
import { getClustersByName } from './get-clusters-by-name.js';
import { listClusterMembers } from './list-cluster-members.js';
import { createCluster } from './create-cluster.js';
import { updateCluster } from './update-cluster.js';
import { refreshCluster } from './refresh-cluster.js';

const commands: Command[] = [
  listClusters,
  getClustersByName,
  listClusterMembers,
  createCluster,
  updateCluster,
  refreshCluster,
];

export default commands;
