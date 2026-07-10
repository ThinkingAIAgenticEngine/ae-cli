import type { Command } from '../../../framework/types.js';
import { biPanelVersionGet } from './get.js';
import { biPanelVersionPublish } from './publish.js';

const commands: Command[] = [
  biPanelVersionGet,
  biPanelVersionPublish,
];

export default commands;
export { biPanelVersionGet };
export { biPanelVersionPublish };
