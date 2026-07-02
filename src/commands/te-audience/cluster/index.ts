import type { Command } from '../../../framework/types.js';
import { listClusters } from './list-clusters.js';
import { getClustersByName } from './get-clusters-by-name.js';
import { listClusterMembers } from './list-cluster-members.js';
import { buildClusterDefinition } from './build-cluster-definition.js';
import { createCluster } from './create-cluster.js';
import { updateCluster } from './update-cluster.js';
import { refreshCluster } from './refresh-cluster.js';
import { createIdCluster } from './create-id-cluster.js';
import { updateIdCluster } from './update-id-cluster.js';
import { deleteCluster } from './delete-cluster.js';

const commands: Command[] = [
  listClusters,
  getClustersByName,
  listClusterMembers,
  buildClusterDefinition,
  createCluster,
  updateCluster,
  refreshCluster,
  createIdCluster,
  updateIdCluster,
  deleteCluster,
];

export default commands;
