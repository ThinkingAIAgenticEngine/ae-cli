import {
  createTrackingCapabilityCommand,
  debugDeviceIdFlag,
  debugDeviceNameFlag,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingDebugDeviceAdd = createTrackingCapabilityCommand({
  resource: 'debug-device',
  command: 'add',
  capabilityId: 'tracking.debug_device.add',
  description: 'Create or update a Debug device for an AE project.',
  flags: [projectIdFlag, debugDeviceIdFlag, debugDeviceNameFlag],
  risk: 'write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    device_id: ctx.str('device-id'),
    device_name: ctx.str('device-name'),
  }),
});
