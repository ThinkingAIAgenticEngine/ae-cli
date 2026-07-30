import type { Command } from '../../../../framework/types.js';
import { trackingPlanGet } from './get.js';
import { trackingPlanSaveItems } from './save-items.js';
import { trackingPlanDeleteItems } from './delete-items.js';
import { trackingPlanGenerate } from './generate.js';
import { trackingPlanExport } from './export.js';
import { trackingPlanImportExcel } from './import-excel.js';
import { trackingPlanSyncFromMeta } from './sync-from-meta.js';
import { trackingPlanSyncDisplayNames } from './sync-display-names.js';

const commands: Command[] = [
  trackingPlanGet,
  trackingPlanSaveItems,
  trackingPlanDeleteItems,
  trackingPlanGenerate,
  trackingPlanExport,
  trackingPlanImportExcel,
  trackingPlanSyncFromMeta,
  trackingPlanSyncDisplayNames,
];

export default commands;
export { trackingPlanGet };
export { trackingPlanSaveItems };
export { trackingPlanDeleteItems };
export { trackingPlanGenerate };
export { trackingPlanExport };
export { trackingPlanImportExcel };
export { trackingPlanSyncFromMeta };
export { trackingPlanSyncDisplayNames };
