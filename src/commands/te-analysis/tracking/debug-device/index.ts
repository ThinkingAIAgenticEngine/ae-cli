import type { Command } from '../../../../framework/types.js';
import { trackingDebugDeviceAdd } from './add.js';
import { trackingDebugDeviceList } from './list.js';
import { trackingDebugDeviceSelect } from './select.js';

const commands: Command[] = [
  trackingDebugDeviceList,
  trackingDebugDeviceAdd,
  trackingDebugDeviceSelect,
];

export default commands;
export { trackingDebugDeviceAdd };
export { trackingDebugDeviceList };
export { trackingDebugDeviceSelect };
