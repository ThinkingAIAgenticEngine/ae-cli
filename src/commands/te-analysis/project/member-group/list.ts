import { createAnalysisCapabilityCommand } from '../../capability-shared.js';
import {
  memberGroupPaginationFlags,
  memberGroupPaginationInput,
  memberGroupProjectIdFlag,
  memberGroupProjectInput,
} from './shared.js';

export const projectMemberGroupList = createAnalysisCapabilityCommand({
  resource: 'project member-group',
  command: 'list',
  capabilityId: 'project.member_group.list',
  description: 'List project member groups, their default-join settings, and member counts.',
  flags: [memberGroupProjectIdFlag, ...memberGroupPaginationFlags],
  risk: 'read',
  buildInput: ctx => ({ ...memberGroupProjectInput(ctx), ...memberGroupPaginationInput(ctx) }),
});
