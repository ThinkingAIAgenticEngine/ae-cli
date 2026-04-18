import { createMcpCommand, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const createPublicAccessLink = createMcpCommand({
  command: '+create_public_access_link',
  description: 'Create a public access link for the project. Supports dashboard and bi_panel targets and validates the access-control time range.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'company_id', type: 'number', required: false, desc: 'Optional company ID. If omitted, the company ID of the project is used.' },
    { name: 'resource_type', type: 'string', required: true, desc: 'Access target type. Supported values: dashboard and bi_panel.' },
    { name: 'resource_id', type: 'number', required: true, desc: 'Access target ID. Use a dashboard ID when resource_type is dashboard, and a BI panel ID when resource_type is bi_panel.' },
    { name: 'access_controls', type: 'json', required: true, desc: 'Public access control JSON. For dashboard, DN/GF/UA control title, filters, and refresh behavior. For bi_panel, the default is an empty object.' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional remark. Maximum length: 200 characters.' },
    { name: 'effective_at', type: 'string', required: true, desc: 'Effective time. Format: yyyy-MM-dd HH:mm:ss' },
    { name: 'expires_at', type: 'string', required: true, desc: 'Expiration time. Format: yyyy-MM-dd HH:mm:ss' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    companyId: optionalNumber(ctx, 'company_id'),
    resourceType: ctx.str('resource_type'),
    resourceId: ctx.num('resource_id'),
    accessControls: requiredJsonString(ctx, 'access_controls'),
    remark: optionalString(ctx, 'remark'),
    effectiveAt: ctx.str('effective_at'),
    expiresAt: ctx.str('expires_at'),
  }),
});
