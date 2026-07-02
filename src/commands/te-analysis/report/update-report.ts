import { createMcpCommand, optionalNumber, optionalString } from '../shared.js';

export const updateReport = createMcpCommand({
  command: '+update_report',
  description: 'Update an existing report. Supports updating name, description, and QP. At least one of report_name, report_desc, or qp must be provided. When updating qp, also provide report_model. First call +get_report_definition to retrieve the current version number.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'report_id', type: 'number', required: true, desc: 'Report ID to update' },
    { name: 'version', type: 'number', required: true, desc: 'Current report version number. Retrieve via +get_report_definition.' },
    { name: 'report_name', type: 'string', required: false, desc: 'New report name. Omit to keep existing.' },
    { name: 'report_desc', type: 'string', required: false, desc: 'New report description. Omit to keep existing.' },
    { name: 'qp', type: 'string', required: false, desc: 'New QP JSON string. Omit to keep existing. When provided, also supply report_model.' },
    { name: 'report_model', type: 'number', required: false, desc: 'Analysis model type integer (e.g. 1=event, 2=retention). Required when qp is provided.' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    reportId: ctx.num('report_id'),
    version: ctx.num('version'),
    reportName: optionalString(ctx, 'report_name'),
    reportDesc: optionalString(ctx, 'report_desc'),
    qp: optionalString(ctx, 'qp'),
    reportModel: optionalNumber(ctx, 'report_model'),
  }),
});
