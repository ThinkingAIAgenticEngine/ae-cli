import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  jsonArray,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataSuperMetadataBatchEdit = createAnalysisMetaCapabilityCommand({
  resource: 'super-metadata',
  command: 'batch-edit',
  capabilityId: 'metadata.super_metadata.batch_edit',
  description: 'Batch edit descriptions and remarks for effective system metadata.',
  flags: [
    projectIdFlag,
    { name: 'type', type: 'string', required: true, desc: 'Metadata type to edit: event, event_property, or user_property.' },
    { name: 'items', type: 'json', required: true, desc: 'Batch edit item JSON array. Event items use event_name/event_desc/remark; property items use prop_name/prop_desc/prop_remark.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    type: ctx.str('type'),
    items: jsonArray(ctx, 'items'),
  }),
});
