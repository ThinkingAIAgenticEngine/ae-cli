import {
  createTrackingCapabilityCommand,
  dataNameFlag,
  endTimeFlag,
  projectIdFlag,
  projectInput,
  startTimeFlag,
} from '../shared.js';

export const trackingIngestErrorList = createTrackingCapabilityCommand({
  resource: 'ingest-error',
  command: 'list',
  capabilityId: 'tracking.ingest_error.list',
  description: 'List tracking ingest errors for one data name.',
  flags: [projectIdFlag, dataNameFlag, startTimeFlag, endTimeFlag],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), data_name: ctx.str('data-name'), start_time: ctx.str('start-time'), end_time: ctx.str('end-time') }),
});
