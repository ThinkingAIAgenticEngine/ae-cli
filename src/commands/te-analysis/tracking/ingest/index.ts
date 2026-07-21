import type { Command } from '../../../../framework/types.js';
import { trackingIngestSummary } from './summary.js';

const commands: Command[] = [
  trackingIngestSummary,
];

export default commands;
export { trackingIngestSummary };
