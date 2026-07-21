import type { Command } from '../../../framework/types.js';
import { analysisAlertList } from './list.js';
import { analysisAlertGet } from './get.js';
import { analysisAlertCreate } from './create.js';
import { analysisAlertUpdate } from './update.js';
import { analysisAlertDelete } from './delete.js';
import { analysisAlertStart } from './start.js';
import { analysisAlertStop } from './stop.js';

const commands: Command[] = [
  analysisAlertList,
  analysisAlertGet,
  analysisAlertCreate,
  analysisAlertUpdate,
  analysisAlertDelete,
  analysisAlertStart,
  analysisAlertStop,
];

export default commands;
export { analysisAlertList };
export { analysisAlertGet };
export { analysisAlertCreate };
export { analysisAlertUpdate };
export { analysisAlertDelete };
export { analysisAlertStart };
export { analysisAlertStop };
