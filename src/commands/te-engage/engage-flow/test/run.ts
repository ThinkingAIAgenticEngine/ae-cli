import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Submits a flow canvas test run. */
export const testRun = createEngageFlowCapabilityCommand({
  resource: 'test',
  command: 'run',
  capabilityId: 'engage-flow.test.run',
  description: 'Submit an existing flow canvas test version by flow UUID.',
  flags: [
    { name: 'flow-uuid', type: 'string', required: true, desc: 'Existing test flow UUID to submit.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ flow_uuid: ctx.str('flow-uuid') }),
});
