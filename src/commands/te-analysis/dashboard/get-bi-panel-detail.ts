import { createMcpCommand, optionalJson } from '../shared.js';

export const getBiPanelDetail = createMcpCommand({
  command: '+get_bi_panel_detail',
  description: 'Get a BI panel released structure without querying data. Use this after list_bi_panels to inspect pages, queryable charts, summary, dashboard-level controls, and page chart filter controls.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'panel_id', type: 'number', required: true, desc: 'BI panel ID returned by +list_bi_panels' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional detail sections. Supported values: basic, pages, charts, parameterControls, permissionControls, chartFilterControls, summary.', alias: 'f' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    panelId: ctx.num('panel_id'),
    fields: optionalJson(ctx, 'fields'),
  }),
});
