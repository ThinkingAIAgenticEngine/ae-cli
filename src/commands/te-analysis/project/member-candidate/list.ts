import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectMemberCandidateList = createAnalysisCapabilityCommand({
  resource: 'project member-candidate',
  command: 'list',
  capabilityId: 'project.member_candidate.list',
  description: 'List candidate users and role/data-power options for adding project members.',
  flags: [
    projectIdFlag,
    { name: 'type', type: 'string', required: true, desc: 'Add type accepted by ProjMemberAddTypeEnum.' },
    { name: 'login-names', type: 'string', required: false, desc: 'Comma-separated login names when checking new users.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    type: ctx.str('type'),
    login_names: optionalString(ctx, 'login-names'),
  }),
});
