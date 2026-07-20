import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
  projectIdFlag,
  requestIdFlag,
  requiredPayloadFlag,
} from '../../capability-shared.js';

export const projectMemberHandoverExport = createAnalysisCapabilityCommand({
  resource: 'project member-handover',
  command: 'export',
  capabilityId: 'project.member_handover.export',
  description: 'Run batch project member asset handover and export the generated detail file as a CLI artifact.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
    requestIdFlag,
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
    request_id: optionalString(ctx, 'request-id'),
    yes: true,
  }),
});
