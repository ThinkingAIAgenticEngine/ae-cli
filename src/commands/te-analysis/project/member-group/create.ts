import { createAnalysisCapabilityCommand } from '../../capability-shared.js';
import {
  memberGroupNameFlag,
  memberGroupNameInput,
  memberGroupProjectIdFlag,
  memberGroupProjectInput,
} from './shared.js';

export const projectMemberGroupCreate = createAnalysisCapabilityCommand({
  resource: 'project member-group',
  command: 'create',
  capabilityId: 'project.member_group.create',
  description: 'Create an empty project member group without automatic enrollment of new project members.',
  flags: [memberGroupProjectIdFlag, memberGroupNameFlag],
  risk: 'write',
  buildInput: ctx => ({ ...memberGroupProjectInput(ctx), ...memberGroupNameInput(ctx) }),
});
