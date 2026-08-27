import type { Command } from '../../framework/types.js';
import { dataIntegrationInspect } from './inspect.js';
import { dataIntegrationPlan } from './plan.js';
import { dataIntegrationConvert } from './convert.js';
import { dataIntegrationUpload } from './upload.js';
import { dataIntegrationHandoff } from './handoff.js';
import { dataIntegrationReuse } from './reuse.js';

const commands: Command[] = [dataIntegrationInspect, dataIntegrationPlan, dataIntegrationConvert, dataIntegrationUpload, dataIntegrationHandoff, dataIntegrationReuse];

export default commands;
export { dataIntegrationInspect, dataIntegrationPlan, dataIntegrationConvert, dataIntegrationUpload, dataIntegrationHandoff, dataIntegrationReuse };
