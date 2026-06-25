import { createMcpCommand, optionalJson, optionalNumber, optionalString } from '../shared.js';

export const listBiPanels = createMcpCommand({
  command: '+list_bi_panels',
  description: 'List BI panels accessible to the current MCP user in a project. Use this before requesting BI panel structure or data. Does not return pages, charts, controls, raw config, SQL, or permission-rule details.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Fuzzy matches BI panel names.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional returned fields. Supported values: panelId, name, spaceId, spaceName, ownerName, updatedAt, pageCount, hasSummary.', alias: 'f' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size. Default: 20, maximum: 10000.', alias: 'l' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset. Default: 0.', alias: 'o' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
