import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  queryFlag,
} from './shared.js';
import { directoryLimitFlag, directoryOffsetFlag } from '../capability-shared.js';

export const analysisAlertList = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'list',
  capabilityId: 'analysis.alert.list',
  description: 'List project alerts.',
  flags: [projectIdFlag, queryFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), query: optionalString(ctx, 'query'), limit: optionalNumber(ctx, 'limit'), offset: optionalNumber(ctx, 'offset') }),
});
