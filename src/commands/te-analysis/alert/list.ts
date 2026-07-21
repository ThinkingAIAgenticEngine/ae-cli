import {
  compactInput,
  createAnalysisCapabilityCommand,
  limitFlag,
  offsetFlag,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  queryFlag,
} from './shared.js';

export const analysisAlertList = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'list',
  capabilityId: 'analysis.alert.list',
  description: 'List project alerts.',
  flags: [projectIdFlag, queryFlag, limitFlag, offsetFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), query: optionalString(ctx, 'query'), limit: optionalNumber(ctx, 'limit'), offset: optionalNumber(ctx, 'offset') }),
});
