import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Batch deletes whitelist entries from a project by their whitelist IDs. */
export const whitelistDelete = createEngageSettingCapabilityCommand({
  resource: 'whitelist',
  command: 'delete',
  capabilityId: 'engage-setting.whitelist.delete',
  description: 'Batch delete whitelist entries from a project by their whitelist IDs.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'whitelist-ids',
      type: 'json',
      required: true,
      desc: "JSON array of whitelist entry IDs to delete, e.g. '[\"wl-1\",\"wl-2\"]'.",
    },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    whitelist_ids: ctx.json('whitelist-ids'),
  }),
});
