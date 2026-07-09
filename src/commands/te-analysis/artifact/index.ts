import type { Command } from '../../../framework/types.js';
import { artifactDownload } from './download.js';

const commands: Command[] = [
  artifactDownload,
];

export default commands;
export { artifactDownload };
