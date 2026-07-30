import type { Flag } from '../../../../framework/types.js';
import {
  compactInput,
  createTrackingCapabilityCommand,
  debugDeviceIdFlag,
  eventNameFlag,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../shared.js';

const debugStartTimeFlag: Flag = {
  name: 'start-time',
  type: 'string',
  required: false,
  desc: 'Query start time in YYYY-MM-DD HH:mm:ss local time. Defaults to one hour ago.',
};

export const trackingDebugDataList = createTrackingCapabilityCommand({
  resource: 'debug-data',
  command: 'list',
  capabilityId: 'tracking.debug_data.list',
  description: 'List Debug data received from one device.',
  flags: [projectIdFlag, debugDeviceIdFlag, debugStartTimeFlag, eventNameFlag],
  risk: 'read',
  buildInput: (ctx) =>
    compactInput({
      ...projectInput(ctx),
      device_id: ctx.str('device-id'),
      start_time:
        optionalString(ctx, 'start-time') ??
        formatLocalTime(new Date(Date.now() - 60 * 60 * 1000)),
      event_name: optionalString(ctx, 'event-name'),
    }),
  postProcess: (result, input) => {
    const data = isRecord(result) ? result : {};
    const eventList = Array.isArray(data.event_list) ? data.event_list : [];
    const deviceDataList = Array.isArray(data.device_data_list)
      ? data.device_data_list
      : [];
    return {
      device_id: input.device_id,
      start_time: input.start_time,
      ...(input.event_name ? { event_name: input.event_name } : {}),
      has_data: deviceDataList.length > 0,
      event_count: eventList.length,
      data_count: deviceDataList.length,
      event_list: eventList,
      device_data_list: deviceDataList,
    };
  },
});

function formatLocalTime(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return [
    value.getFullYear(),
    '-',
    pad(value.getMonth() + 1),
    '-',
    pad(value.getDate()),
    ' ',
    pad(value.getHours()),
    ':',
    pad(value.getMinutes()),
    ':',
    pad(value.getSeconds()),
  ].join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
