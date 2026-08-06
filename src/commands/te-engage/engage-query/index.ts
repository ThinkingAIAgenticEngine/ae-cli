import type { Command } from '../../../framework/types.js';
import { artifactDownload } from './artifact/download.js';
import { queryCancel } from './query/cancel.js';
import { runInspect } from './run/inspect.js';

const commands: Command[] = [
  runInspect,
  artifactDownload,
  queryCancel,
];

export { artifactDownload } from './artifact/download.js';
export { queryCancel } from './query/cancel.js';
export { runInspect } from './run/inspect.js';

export default commands;
