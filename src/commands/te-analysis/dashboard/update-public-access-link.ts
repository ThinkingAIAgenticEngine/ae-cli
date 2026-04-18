import { createMcpCommand, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const updatePublicAccessLink = createMcpCommand({
  command: '+update_public_access_link',
  description: 'Update the access controls, remark, and effective time range of a public access link.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'company_id', type: 'number', required: false, desc: 'Optional company ID. If omitted, the company ID of the project is used.' },
    { name: 'link_id', type: 'number', required: true, desc: 'Link ID' },
    { name: 'access_controls', type: 'json', required: true, desc: 'Public access control JSON' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional remark. Maximum length: 200 characters.' },
    { name: 'effective_at', type: 'string', required: true, desc: 'Effective time. Format: yyyy-MM-dd HH:mm:ss' },
    { name: 'expires_at', type: 'string', required: true, desc: 'Expiration time. Format: yyyy-MM-dd HH:mm:ss' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    companyId: optionalNumber(ctx, 'company_id'),
    linkId: ctx.num('link_id'),
    accessControls: requiredJsonString(ctx, 'access_controls'),
    remark: optionalString(ctx, 'remark'),
    effectiveAt: ctx.str('effective_at'),
    expiresAt: ctx.str('expires_at'),
  }),
});
