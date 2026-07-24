import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalJsonArray,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataSuperMetadataBatchCreate = createAnalysisMetaCapabilityCommand({
  resource: 'super-metadata',
  command: 'batch-create',
  capabilityId: 'metadata.super_metadata.batch_create',
  description: 'Batch create effective system metadata: super events, event properties, and user properties.',
  flags: [
    projectIdFlag,
    { name: 'events', type: 'json', required: false, desc: 'Optional super event JSON array. Items use event_name, event_desc, remark, and super_event_prop_names.' },
    { name: 'event-properties', type: 'json', required: false, desc: 'Optional event property JSON array. Items use prop_name, select_type, prop_desc, prop_remark, common_prop, and super_event_names.' },
    { name: 'user-properties', type: 'json', required: false, desc: 'Optional user property JSON array. Items use prop_name, select_type, prop_desc, and prop_remark.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    events: optionalJsonArray(ctx, 'events'),
    event_properties: optionalJsonArray(ctx, 'event-properties'),
    user_properties: optionalJsonArray(ctx, 'user-properties'),
  }),
});
