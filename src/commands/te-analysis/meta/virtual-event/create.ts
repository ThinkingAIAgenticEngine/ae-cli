import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalJson,
  optionalBoolean,
  optionalString,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualEventCreate = createAnalysisMetaCapabilityCommand({
  resource: 'virtual-event',
  command: 'create',
  capabilityId: 'metadata.virtual_event.create',
  description: 'Create a virtual event from events and filters.',
  flags: [
    projectIdFlag,
    payloadFlag,
    { name: 'event-name', type: 'string', required: false, desc: "Virtual event name. Must start with 'ta@'." },
    { name: 'event-desc', type: 'string', required: false, desc: 'Virtual event display name.' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional virtual event remark.' },
    { name: 'events', type: 'json', required: false, desc: 'JSON array of events to combine.' },
    { name: 'filter', type: 'json', required: false, desc: 'Optional global filter JSON.' },
    { name: 'override', type: 'boolean', required: false, desc: 'Whether to override an existing virtual event rule.' },
  ],
  risk: 'write',
  buildInput: (ctx) => (compactInput({
    ...projectInput(ctx),
    payload: virtualEventPayload(ctx),
    override: optionalBoolean(ctx, 'override'),
  })),
});

function virtualEventPayload(ctx: Parameters<typeof optionalJson>[0]): unknown {
  const payload = optionalJson(ctx, 'payload');
  if (payload !== undefined) {
    return payload;
  }
  const eventName = optionalString(ctx, 'event-name');
  const eventDesc = optionalString(ctx, 'event-desc');
  const events = optionalJson(ctx, 'events');
  if (eventName === undefined || eventDesc === undefined || events === undefined) {
    throw new Error('Pass --payload, or pass --event-name, --event-desc, and --events');
  }
  return compactInput({
    event_name: eventName,
    event_desc: eventDesc,
    remark: optionalString(ctx, 'remark'),
    rule: compactInput({
      events,
      filter: optionalJson(ctx, 'filter'),
    }),
  });
}
