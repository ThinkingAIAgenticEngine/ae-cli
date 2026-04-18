import type { Command } from '../../../framework/types.js';
import { getResourceUrl } from './get-resource-url.js';

const commands: Command[] = [
  getResourceUrl,
];

export default commands;
export { getResourceUrl };
