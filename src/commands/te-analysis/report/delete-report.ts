import { createMcpCommand } from '../shared.js';

export const deleteReport = createMcpCommand({
  command: '+delete_report',
  description: 'Delete a report by reportId',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'report_id', type: 'number', required: true, desc: 'Report ID to delete' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    reportId: ctx.num('report_id'),
  }),
});
