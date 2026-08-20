import type { Command } from '../../framework/types.js';
import { dataIntegrationInspect } from './local-data/inspect.js';
import { dataIntegrationPlan } from './local-data/plan.js';
import { dataIntegrationConvert } from './local-data/convert.js';
import { dataIntegrationUpload } from './local-data/upload.js';
import { dataIntegrationHandoff } from './local-data/handoff.js';
import { dataIntegrationReuse } from './local-data/reuse.js';

const commands: Command[] = [dataIntegrationInspect, dataIntegrationPlan, dataIntegrationConvert, dataIntegrationUpload, dataIntegrationHandoff, dataIntegrationReuse];

export default commands;
export { dataIntegrationInspect, dataIntegrationPlan, dataIntegrationConvert, dataIntegrationUpload, dataIntegrationHandoff, dataIntegrationReuse };
