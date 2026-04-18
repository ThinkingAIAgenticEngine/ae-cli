import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getReportDefinition = createMcpCommand({
  command: '+get_report_definition',
  description: 'Get the definition details of a single report. Returns model type, event configuration, display configuration, and other definition data without executing a data query.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'report_id', type: 'number', required: true, desc: 'Report ID', alias: 'r' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      reportId: ctx.num('report_id'),
    }),
});
