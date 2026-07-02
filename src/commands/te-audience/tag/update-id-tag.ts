import { createMcpCommand, optionalNumber, optionalString } from '../shared.js';

export const updateIdTag = createMcpCommand({
  command: '+update_id_tag',
  description: 'Update an existing ID tag by re-uploading CSV file content as plain text. The tag is identified by tag_name. The operation is asynchronous.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'tag_name', type: 'string', required: true, desc: 'Tag name to update' },
    { name: 'file_content', type: 'string', required: true, desc: 'New CSV file content as plain text. No header row, UTF-8 encoding. Column 1: user ID. Column 2: tag value (optional). Example row: user_001,gold_member. Max 100MB.' },
    { name: 'display_name', type: 'string', required: false, desc: 'Optional new display name' },
    { name: 'remarks', type: 'string', required: false, desc: 'Optional new remarks (max 200 characters)' },
    { name: 'entity_id', type: 'number', required: false, desc: 'Entity ID to associate the tag with' },
    { name: 'main_column_name', type: 'string', required: false, desc: 'Optional new main column name for ID matching' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    tagName: ctx.str('tag_name'),
    fileContent: ctx.str('file_content'),
    displayName: optionalString(ctx, 'display_name'),
    remarks: optionalString(ctx, 'remarks'),
    entityId: optionalNumber(ctx, 'entity_id'),
    mainColumnName: optionalString(ctx, 'main_column_name'),
  }),
});
