import {
  createTrackingCapabilityCommand,
  endTimeFlag,
  projectIdFlag,
  projectInput,
  startTimeFlag,
} from '../shared.js';

export const trackingIngestSummary = createTrackingCapabilityCommand({
  resource: 'ingest',
  command: 'summary',
  capabilityId: 'tracking.ingest.summary',
  description: 'Get tracking ingest summary.',
  flags: [projectIdFlag, startTimeFlag, endTimeFlag],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), start_time: ctx.str('start-time'), end_time: ctx.str('end-time') }),
});
