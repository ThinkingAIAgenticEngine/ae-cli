import { randomUUID } from 'node:crypto';
import { buildCapabilityGatewayUrl, CapabilityGatewayError, executeCapability } from '../../../core/capability-api.js';
import { CliValidationError } from '../../../core/errors.js';
import type { Command, RuntimeContext } from '../../../framework/types.js';

const capability = 'analysis.member_invitation.send';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invitationInput(ctx: RuntimeContext) {
  const email = ctx.str('email').trim().toLowerCase();
  const projectId = ctx.str('project-id');
  const projectRole = ctx.str('project-role').trim();
  const requestId = ctx.str('request-id');
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CliValidationError('--email must be a valid email address of at most 100 characters');
  }
  if (!/^[1-9]\d{0,9}$/.test(projectId) || Number(projectId) > 2_147_483_647) {
    throw new CliValidationError('--project-id must be a positive decimal integer at most 2147483647');
  }
  if (!projectRole || projectRole.length > 128 || /[\r\n]/.test(projectRole)) {
    throw new CliValidationError('--project-role must be a non-empty role name of at most 128 characters');
  }
  if ((requestId || ctx.has?.('request-id')) && !uuidPattern.test(requestId)) {
    throw new CliValidationError('--request-id must be a UUID');
  }
  return { email, project_id: projectId, project_role: projectRole, request_id: requestId.toLowerCase() || undefined };
}

export const sendMemberInvitation: Command = {
  service: 'analysis',
  resource: 'member-invitation',
  command: 'send',
  capabilityId: capability,
  description: 'Email an invitation to join the current AE company with the selected project role',
  flags: [
    { name: 'email', type: 'string', required: true, sensitive: true, desc: 'Recipient email address' },
    { name: 'project-id', type: 'string', required: true, desc: 'Business project ID in the current company' },
    { name: 'project-role', type: 'string', required: true, desc: 'Assignable project role name from project role list' },
    { name: 'request-id', type: 'string', desc: 'Optional UUID. Reuse the same ID to retry an identical invitation.' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildCapabilityGatewayUrl(ctx.host(), 'analysis', `capabilities/${capability}/execute`),
    body: { input: { ...invitationInput(ctx), email: '[REDACTED]' } },
  }),
  execute: async (ctx) => {
    const input = invitationInput(ctx);
    const requestId = input.request_id ?? randomUUID();
    const retryHint = `If you retry the same invitation, pass --request-id ${requestId}.`;
    try {
      const result = await executeCapability(ctx.host(), 'analysis', capability, {
        ...input,
        request_id: requestId,
      }, {
        includeClientContextInBody: false,
        signal: AbortSignal.timeout(50_000),
      });
      if (result?.sent !== true) {
        throw new CapabilityGatewayError('The invitation service did not confirm sending.',
          'INVITATION_INVALID_RESPONSE', undefined, retryHint);
      }
      return { sent: true, request_id: requestId };
    } catch (error) {
      if (error instanceof CapabilityGatewayError) {
        if (error.httpStatus === 404 || error.code === 'CAPABILITY_NOT_FOUND') {
          throw new CapabilityGatewayError('Member invitations are unavailable on this AE host.',
            'MEMBER_INVITATION_UNAVAILABLE', 404, error.hint, error.meta);
        }
        if ((error.httpStatus ?? 0) >= 500 || error.code === 'MEMBER_INVITATION_UNAVAILABLE') {
          throw new CapabilityGatewayError(error.message, error.code, error.httpStatus,
            [error.hint, retryHint].filter(Boolean).join(' '), error.meta, error.type, error.details);
        }
      }
      if (error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')) {
        throw new CapabilityGatewayError('The invitation send result could not be confirmed.',
          'MEMBER_INVITATION_UNAVAILABLE', undefined, retryHint);
      }
      throw error;
    }
  },
};
