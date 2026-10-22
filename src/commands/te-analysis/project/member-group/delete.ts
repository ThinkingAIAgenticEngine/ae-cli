import { createAnalysisCapabilityCommand } from '../../capability-shared.js';
import {
  memberGroupIdFlag,
  memberGroupInput,
  memberGroupProjectIdFlag,
} from './shared.js';

export const projectMemberGroupDelete = createAnalysisCapabilityCommand({
  resource: 'project member-group',
  command: 'delete',
  capabilityId: 'project.member_group.delete',
  description: 'Delete a project member group while retaining its company and project members.',
  helpText: 'Deleting a member group can revoke access to shared assets. Review --dry-run before confirming with --yes.',
  flags: [memberGroupProjectIdFlag, memberGroupIdFlag],
  risk: 'high-risk-write',
  buildInput: ctx => ({ ...memberGroupInput(ctx), yes: true }),
});
