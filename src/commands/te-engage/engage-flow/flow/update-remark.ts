import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Updates a flow version remark. */
export const flowUpdateRemark = createEngageFlowCapabilityCommand({
  resource: 'flow',
  command: 'update-remark',
  capabilityId: 'engage-flow.version.update-remark',
  description: 'Update a flow version remark.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'flow-uuid', type: 'string', required: true, desc: 'Flow version UUID whose remark should be updated.' },
    {
      name: 'flow-version-desc',
      type: 'string',
      required: true,
      desc: 'Updated flow version remark. Pass an empty string to clear it.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    flow_uuid: ctx.str('flow-uuid'),
    flow_version_desc: ctx.str('flow-version-desc'),
  }),
});
