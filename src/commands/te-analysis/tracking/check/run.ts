import {
  compactInput,
  checkScopeFlag,
  createTrackingCapabilityCommand,
  optionalJson,
  projectIdFlag,
  projectInput,
  resultScopeFlag,
} from '../shared.js';

export const trackingCheckRun = createTrackingCapabilityCommand({
  resource: 'check',
  command: 'run',
  capabilityId: 'tracking.check.run',
  description: 'Run tracking plan validation.',
  flags: [projectIdFlag, checkScopeFlag, resultScopeFlag],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    check_scope: ctx.json('check-scope'),
    result_scope: optionalJson(ctx, 'result-scope'),
  }),
});
