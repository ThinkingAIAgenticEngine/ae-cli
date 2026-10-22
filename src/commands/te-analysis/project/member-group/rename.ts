import { createAnalysisCapabilityCommand } from '../../capability-shared.js';
import {
  memberGroupIdFlag,
  memberGroupInput,
  memberGroupNameFlag,
  memberGroupNameInput,
  memberGroupProjectIdFlag,
} from './shared.js';

export const projectMemberGroupRename = createAnalysisCapabilityCommand({
  resource: 'project member-group',
  command: 'rename',
  capabilityId: 'project.member_group.rename',
  description: 'Rename a project member group while preserving all members and default-join settings.',
  flags: [memberGroupProjectIdFlag, memberGroupIdFlag, memberGroupNameFlag],
  risk: 'write',
  buildInput: ctx => ({ ...memberGroupInput(ctx), ...memberGroupNameInput(ctx) }),
});
