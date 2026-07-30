import type { Command } from '../../../framework/types.js';
import plan from './plan/index.js';
import sdkSample from './sdk-sample/index.js';
import planChangeLog from './plan-change-log/index.js';
import check from './check/index.js';
import ingest from './ingest/index.js';
import ingestError from './ingest-error/index.js';
import liveData from './live-data/index.js';
import eventBlacklist from './event-blacklist/index.js';
import debugDevice from './debug-device/index.js';
import debugData from './debug-data/index.js';

const commands: Command[] = [
  ...plan,
  ...sdkSample,
  ...planChangeLog,
  ...check,
  ...ingest,
  ...ingestError,
  ...liveData,
  ...eventBlacklist,
  ...debugDevice,
  ...debugData,
];

export default commands;
