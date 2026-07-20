import {
  createAnalysisCapabilityCommand,
  requestIdFlag,
  timeoutSecondsFlag,
} from '../capability-shared.js';
import {
  coordinateFlag,
  createResultClusterInput,
  sourceFlag,
} from './shared.js';

export const queryCreateResultCluster = createAnalysisCapabilityCommand({
  resource: 'query',
  command: 'create-result-cluster',
  capabilityId: 'analysis.query.create_result_cluster',
  description: 'Create a reusable user or custom-entity result cluster from one cell returned by a synchronous analysis preview. The selected metric must advertise create_result_cluster. Exports never create query contexts.',
  flags: [
    { name: 'query-context-id', type: 'string', required: true, desc: 'query_context_id returned by a synchronous analysis preview. Never use an export response.' },
    sourceFlag,
    coordinateFlag,
    { name: 'cluster-name', type: 'string', required: true, desc: 'Unique result cluster name. Use letters, digits, and underscores.' },
    { name: 'display-name', type: 'string', required: false, desc: 'Optional result cluster display name.' },
    { name: 'zone-offset', type: 'number', required: false, desc: 'Optional timezone offset. UTC+8 is 8; UTC-5 is -5.' },
    requestIdFlag,
    timeoutSecondsFlag,
  ],
  risk: 'write',
  buildInput: createResultClusterInput,
});
