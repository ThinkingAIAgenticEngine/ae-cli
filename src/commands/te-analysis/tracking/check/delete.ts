import {
  confirmFlag,
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
  uuidFlag,
} from '../shared.js';

export const trackingCheckDelete = createTrackingCapabilityCommand({
  resource: 'check',
  command: 'delete',
  capabilityId: 'tracking.check.delete',
  description: 'Delete one tracking validation run.',
  flags: [projectIdFlag, uuidFlag, confirmFlag],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({ ...projectInput(ctx), uuid: ctx.str('uuid'), yes: ctx.bool('confirm') }),
});
