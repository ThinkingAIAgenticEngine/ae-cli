import { kbApi } from '../../core/mcp-access.js';
import type { RuntimeContext } from '../../framework/types.js';

export function requestedContentLanguage(ctx: RuntimeContext): string | undefined {
  const value = ctx.str('content-language');
  if (!value) return undefined;
  if (!/^[A-Za-z]{2,8}$/.test(value.trim())) {
    throw new Error('--content-language must be a BCP-47 primary language subtag, such as ko.');
  }
  return value.trim().toLowerCase();
}

export async function requestWithContentLanguage(
  ctx: RuntimeContext,
  path: string,
  body: Record<string, unknown>,
  api: typeof kbApi = kbApi,
  preserveBusinessErrorCode = false,
): Promise<unknown> {
  try {
    if (preserveBusinessErrorCode) {
      return await api(ctx, 'POST', path, {}, body, { preserveBusinessErrorCode: true });
    }
    return await api(ctx, 'POST', path, {}, body);
  } catch (error) {
    if (body.contentLanguage && error instanceof Error && /^body:\s/.test(error.message)) {
      throw new Error('The server does not support the requested knowledge-base language option.', { cause: error });
    }
    throw error;
  }
}
