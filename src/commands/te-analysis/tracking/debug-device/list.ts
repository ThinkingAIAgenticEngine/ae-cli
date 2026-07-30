import {
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingDebugDeviceList = createTrackingCapabilityCommand({
  resource: 'debug-device',
  command: 'list',
  capabilityId: 'tracking.debug_device.list',
  description:
    'List Debug devices and the device selected by the current CLI user.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
