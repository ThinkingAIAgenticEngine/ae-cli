import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getTagsByName = createMcpCommand({
  command: '+get_tags_by_name',
  description: 'Get tag definition details in batch by tag names',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'names', type: 'json', required: true, desc: 'Tag name list JSON array, e.g. ["tag_a","tag_b"]' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      names: ctx.json('names'),
    }),
});
