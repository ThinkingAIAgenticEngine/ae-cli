import {
  createTrackingCapabilityCommand,
  debugDeviceIdFlag,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingDebugDeviceSelect = createTrackingCapabilityCommand({
  resource: 'debug-device',
  command: 'select',
  capabilityId: 'tracking.debug_device.select',
  description: 'Select the active Debug device for the current CLI user.',
  flags: [projectIdFlag, debugDeviceIdFlag],
  risk: 'write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    device_id: ctx.str('device-id'),
  }),
});
