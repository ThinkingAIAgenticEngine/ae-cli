import { createAnalysisCapabilityCommand } from '../../capability-shared.js';
import {
  memberGroupIdFlag,
  memberGroupInput,
  memberGroupPaginationFlags,
  memberGroupPaginationInput,
  memberGroupProjectIdFlag,
} from './shared.js';

export const projectMemberGroupMembers = createAnalysisCapabilityCommand({
  resource: 'project member-group',
  command: 'members',
  capabilityId: 'project.member_group.members',
  description: 'List members of one project member group with pagination.',
  flags: [memberGroupProjectIdFlag, memberGroupIdFlag, ...memberGroupPaginationFlags],
  risk: 'read',
  buildInput: ctx => ({ ...memberGroupInput(ctx), ...memberGroupPaginationInput(ctx) }),
});
