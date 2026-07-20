import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Creates a config item under a project (name, business type, group, optional avatar). */
export const configItemCreate = createEngageSceneCapabilityCommand({
  resource: 'config-item',
  command: 'create',
  capabilityId: 'engage-scene.config-item.create',
  description: 'Create a config item under a project, including business type, group, and optional avatar.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID (unique within the project).' },
    { name: 'config-name', type: 'string', required: true, desc: 'Config item display name (<=80 chars).' },
    { name: 'business-type', type: 'string', required: true, desc: 'Business type: config_file or params.' },
    { name: 'config-remark', type: 'string', required: false, desc: 'Config item remark (<=200 chars).' },
    { name: 'group-id', type: 'number', required: false, desc: 'Group ID (0 = default group).' },
    { name: 'avatar-word', type: 'json', required: false, desc: 'Optional JSON array of avatar words for the icon.' },
    { name: 'file-name', type: 'string', required: false, desc: 'Optional avatar file name including extension.' },
    { name: 'file-content', type: 'string', required: false, desc: 'Optional base64-encoded avatar file content.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    config_name: ctx.str('config-name'),
    business_type: ctx.str('business-type'),
    config_remark: ctx.str('config-remark') || undefined,
    group_id: ctx.optionalNum('group-id'),
    avatar_word: ctx.json('avatar-word') || undefined,
    file_name: ctx.str('file-name') || undefined,
    file_content: ctx.str('file-content') || undefined,
  }),
});
