import { createAnalysisCapabilityCommand } from '../../capability-shared.js';
import {
  memberGroupChangeInput,
  memberGroupIdFlag,
  memberGroupProjectIdFlag,
  memberGroupUserIdsFlag,
} from './shared.js';

export const projectMemberGroupAddMembers = createAnalysisCapabilityCommand({
  resource: 'project member-group',
  command: 'add-members',
  capabilityId: 'project.member_group.add_members',
  description: 'Add existing project members to a member group while preserving its other members and settings.',
  helpText: 'Group membership can grant access to shared assets. Discover user IDs with project member list and review --dry-run before confirming with --yes.',
  flags: [memberGroupProjectIdFlag, memberGroupIdFlag, memberGroupUserIdsFlag],
  risk: 'high-risk-write',
  buildInput: memberGroupChangeInput,
});
