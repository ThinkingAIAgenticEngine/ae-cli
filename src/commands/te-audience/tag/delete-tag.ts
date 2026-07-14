import { createMcpCommand, optionalBoolean } from '../shared.js';

export const deleteTag = createMcpCommand({
  command: '+delete_tag',
  description: 'Delete a tag by tagName. If dependencies exist, shows an influence list and requires --confirmed to proceed.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'tag_name', type: 'string', required: true, desc: 'Tag name to delete' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Pass after user explicitly confirms deletion despite listed dependencies' },
  ],
  risk: 'high-risk-write',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    tagName: ctx.str('tag_name'),
    confirmed: optionalBoolean(ctx, 'confirmed'),
  }),
});
