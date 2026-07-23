import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
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
    projectIdFlag,
    { name: 'query-context-id', type: 'string', required: true, desc: 'query_context_id returned by a synchronous analysis preview. Never use an export response.' },
    sourceFlag,
    coordinateFlag,
    {
      name: 'cluster-name',
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 24,
      pattern: '^[a-z][a-z0-9_]*$',
      desc: 'Unique result cluster name. Must start with a lowercase letter, contain only lowercase letters, digits, and underscores, and be at most 24 characters.',
    },
    {
      name: 'display-name',
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 80,
      desc: 'Optional result cluster display name. Maximum: 80 characters.',
    },
    { name: 'zone-offset', type: 'number', required: false, desc: 'Optional timezone offset. UTC+8 is 8; UTC-5 is -5.' },
    requestIdFlag,
    timeoutSecondsFlag,
  ],
  risk: 'write',
  buildInput: createResultClusterInput,
});
