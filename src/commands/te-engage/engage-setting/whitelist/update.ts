import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Updates the note name of an existing whitelist entry by its whitelist_id. */
export const whitelistUpdate = createEngageSettingCapabilityCommand({
  resource: 'whitelist',
  command: 'update',
  capabilityId: 'engage-setting.whitelist.update',
  description: "Update the note name of an existing whitelist entry by its whitelist_id.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'whitelist-id', type: 'string', required: true, desc: 'Whitelist entry ID to modify.' },
    { name: 'note-name', type: 'string', required: false, desc: 'New note name for the whitelist entry.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    whitelist_id: ctx.str('whitelist-id'),
    note_name: ctx.str('note-name') || undefined,
  }),
});
