import {
  createAnalysisCapabilityCommand,
  requestIdFlag,
  timeoutSecondsFlag,
} from '../capability-shared.js';
import {
  createResultClusterInput,
  targetFlag,
} from './shared.js';

export const queryCreateResultCluster = createAnalysisCapabilityCommand({
  resource: 'query',
  command: 'create-result-cluster',
  capabilityId: 'analysis.query.create_result_cluster',
  description: 'Create a reusable result cluster from users matched by a target in a previous analysis data query context. Works after adhoc, report-data, and dashboard-report-data run/export. Do not pass raw QP.',
  flags: [
    { name: 'query-context-id', type: 'string', required: true, desc: 'query_context_id returned by an analysis data run/export.' },
    targetFlag,
    { name: 'cluster-name', type: 'string', required: true, desc: 'Unique result cluster name. Use letters, digits, and underscores.' },
    { name: 'display-name', type: 'string', required: false, desc: 'Optional result cluster display name.' },
    { name: 'zone-offset', type: 'number', required: false, desc: 'Optional timezone offset. UTC+8 is 8; UTC-5 is -5.' },
    requestIdFlag,
    timeoutSecondsFlag,
  ],
  risk: 'write',
  buildInput: createResultClusterInput,
});
