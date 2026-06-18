import type { Command, RuntimeContext } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_RUN_PATH } from '../shared.js';

const START_PATH = `${BASE_RUN_PATH}/start`;

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    teamId: ctx.str('team-id'),
    input: ctx.str('input'),
  };
  const conversationId = ctx.str('conversation-id');
  if (conversationId) body.conversationId = conversationId;
  const notification = ctx.json('notification');
  if (notification) body.notification = notification;
  const saveToKbId = ctx.str('save-to-kb-id');
  if (saveToKbId) body.saveToKbId = saveToKbId;
  const projectIds = ctx.json('project-ids');
  if (projectIds) body.projectIds = projectIds;
  const projectNames = ctx.json('project-names');
  if (projectNames) body.projectNames = projectNames;
  const spaceIds = ctx.json('space-ids');
  if (spaceIds) body.spaceIds = spaceIds;
  const spaceNames = ctx.json('space-names');
  if (spaceNames) body.spaceNames = spaceNames;
  const dwSpaceCodes = ctx.json('dw-space-codes');
  if (dwSpaceCodes) body.dwSpaceCodes = dwSpaceCodes;
  const dwSpaceNames = ctx.json('dw-space-names');
  if (dwSpaceNames) body.dwSpaceNames = dwSpaceNames;
  return body;
}

export const startRun: Command = {
  service: 'team',
  command: '+run-start',
  description: 'Start a new TeamRun for the given team.',
  flags: [
    { name: 'team-id', type: 'string', required: true, desc: 'Team ID' },
    { name: 'input', type: 'string', required: true, desc: 'Task input (1–50000 chars)' },
    { name: 'conversation-id', type: 'string', required: false, desc: 'Associated conversation ID' },
    { name: 'notification', type: 'json', required: false, desc: 'Notification config JSON, e.g. {"channels":["feishu"],"feishuChatId":"..."}' },
    { name: 'save-to-kb-id', type: 'string', required: false, desc: 'Knowledge base ID to save result to on completion' },
    { name: 'project-ids', type: 'json', required: false, desc: 'Associated project ID list, e.g. ["id1"]' },
    { name: 'project-names', type: 'json', required: false, desc: 'Associated project name list JSON' },
    { name: 'space-ids', type: 'json', required: false, desc: 'Associated space ID list JSON' },
    { name: 'space-names', type: 'json', required: false, desc: 'Associated space name list JSON' },
    { name: 'dw-space-codes', type: 'json', required: false, desc: 'Associated DW space code list JSON' },
    { name: 'dw-space-names', type: 'json', required: false, desc: 'Associated DW space name list JSON' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${START_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', START_PATH, {}, buildBody(ctx)),
};
