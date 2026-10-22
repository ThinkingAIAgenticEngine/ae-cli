import { createAnalysisCapabilityCommand } from '../../capability-shared.js';
import {
  memberGroupChangeInput,
  memberGroupIdFlag,
  memberGroupProjectIdFlag,
  memberGroupUserIdsFlag,
} from './shared.js';

export const projectMemberGroupRemoveMembers = createAnalysisCapabilityCommand({
  resource: 'project member-group',
  command: 'remove-members',
  capabilityId: 'project.member_group.remove_members',
  description: 'Remove selected members from a member group while preserving its other members and settings.',
  helpText: 'Group membership can grant access to shared assets. This removes group memberships only; project and company accounts are retained. Review --dry-run before confirming with --yes.',
  flags: [memberGroupProjectIdFlag, memberGroupIdFlag, memberGroupUserIdsFlag],
  risk: 'high-risk-write',
  buildInput: memberGroupChangeInput,
});
