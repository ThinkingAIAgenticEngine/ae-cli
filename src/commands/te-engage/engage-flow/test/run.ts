import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Submits a flow canvas test run. */
export const testRun = createEngageFlowCapabilityCommand({
  resource: 'test',
  command: 'run',
  capabilityId: 'engage-flow.test.run',
  description:
    'Submit a flow canvas test run to validate node configuration, delivery channels, and user paths.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'request',
      type: 'json',
      required: true,
      desc: 'Snake_case FlowOpReqDTO JSON object containing the complete test flow definition.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), request: ctx.json('request') }),
});
