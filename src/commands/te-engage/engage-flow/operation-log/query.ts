import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Queries aggregated operation records and application logs for a flow canvas. */
export const operationLogQuery = createEngageFlowCapabilityCommand({
  resource: 'operation-log',
  command: 'query',
  capabilityId: 'engage-flow.operation-log.query',
  description:
    'Query aggregated flow operation records and application logs for troubleshooting submission, approval, registration, execution, and distribution issues.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'flow-id', type: 'string', required: true, desc: 'Flow ID to inspect.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), flow_id: ctx.str('flow-id') }),
});
