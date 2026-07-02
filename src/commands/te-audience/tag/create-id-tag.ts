import { createMcpCommand, optionalNumber, optionalString } from '../shared.js';

export const createIdTag = createMcpCommand({
  command: '+create_id_tag',
  description: 'Create an ID tag by providing CSV file content as plain text. The CSV should contain two columns: user ID and tag value. The operation is asynchronous.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'display_name', type: 'string', required: true, desc: 'Tag display name (1-80 characters)' },
    { name: 'file_content', type: 'string', required: true, desc: 'CSV file content as plain text. No header row, UTF-8 encoding. Column 1: user ID. Column 2: tag value (optional). Example row: user_001,gold_member. Max 100MB.' },
    { name: 'entity_id', type: 'number', required: true, desc: 'Entity ID to associate the tag with' },
    { name: 'tag_name', type: 'string', required: false, desc: 'Optional tag name (letters/digits/underscores, starts with a letter, max 80 chars). Auto-generated if omitted.' },
    { name: 'remarks', type: 'string', required: false, desc: 'Optional remarks (max 200 characters)' },
    { name: 'main_column_name', type: 'string', required: false, desc: 'Optional main column name for ID matching' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    displayName: ctx.str('display_name'),
    fileContent: ctx.str('file_content'),
    entityId: ctx.num('entity_id'),
    tagName: optionalString(ctx, 'tag_name'),
    remarks: optionalString(ctx, 'remarks'),
    mainColumnName: optionalString(ctx, 'main_column_name'),
  }),
});
