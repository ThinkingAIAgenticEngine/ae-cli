import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from './shared.js';
import { directoryLimitFlag, directoryOffsetFlag } from '../capability-shared.js';
import { optionalQueries, queriesFlag, validateQueriesFlag } from '../catalog-list.js';

export const analysisAlertList = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'list',
  capabilityId: 'analysis.alert.list',
  description: 'List project alerts.',
  flags: [projectIdFlag, queriesFlag, directoryLimitFlag, directoryOffsetFlag],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), queries: optionalQueries(ctx), limit: optionalNumber(ctx, 'limit'), offset: optionalNumber(ctx, 'offset') }),
});
