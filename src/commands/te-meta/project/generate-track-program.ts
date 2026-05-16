import { createMcpCommand, requiredJsonString } from '../shared.js';

export const generateTrackProgram = createMcpCommand({
  command: '+generate_track_program',
  description: 'Generate a tracking plan from structured business context (async)',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'language', type: 'string', required: true, alias: 'l', desc: 'Language code (zh-CN, en-US, ja-JP, ko-KR)' },
    { name: 'form_data', type: 'json', required: true, desc: 'Structured business context JSON object, optional fields for example: account_system, revenue_model, core_gameplay, currency_system, main_entries, predefinedEvent, developmentCarrier' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    language: ctx.str('language'),
    formData: ctx.json('form_data'),
  }),
});