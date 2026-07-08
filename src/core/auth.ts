import { getActiveHost } from './config.js';
import { logger } from './logger.js';
import { getValidAccessToken, SecureStoreAuthError, load as secureStoreLoad, save as secureStoreSave } from './secure-store.js';
import { safeJsonParse } from './json-utils.js';

/**
 * Resolve the host URL to use. Simply reads activeHost from config.
 * The --host flag override is handled at the runner/command level.
 */
export function resolveHost(hostOverride?: string): string {
  if (hostOverride) return hostOverride;
  return getActiveHost();
}

/**
 * Validate token
 * @param token
 * @param hostUrl
 */
export async function validateToken(token: string, hostUrl: string): Promise<boolean> {
  // F-013: the server's /v1/oauth/checkToken binds accessToken via @RequestParam (query/form), NOT a JSON body.
  const url = `${hostUrl}/v1/oauth/checkToken`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ accessToken: token }).toString(),
    });
    const respJson = safeJsonParse(await resp.text());
    return respJson?.return_code === 0;
  } catch {
    return false;
  }
}

/**
 * Mark the stored access token as stale so the next getToken() may refresh (if a refresh token exists).
 * Used for one-shot retry after HTTP 401 / -1001.
 */
export function invalidateAccessTokenForRetry(hostUrl: string): void {
  const payload = secureStoreLoad(hostUrl);
  if (!payload) return;
  secureStoreSave(hostUrl, { ...payload, accessExpiresAt: new Date(0).toISOString() });
  logger.info(`auth: marked access token stale for retry on ${hostUrl}`);
}

/**
 * Get a valid access token from secure-store (device code flow; includes automatic refresh).
 * Throws an error with guidance when no source can provide a token.
 */
export async function getToken(hostUrl: string): Promise<string> {
  if (!hostUrl) {
    throw new Error(
      `No AE host configured.\n` +
      `Run: ae-cli config set-host <url>`
    );
  }

  try {
    const secureToken = await getValidAccessToken(hostUrl);
    logger.info(`Using secure-store token for ${hostUrl}`);
    return secureToken;
  } catch (e: any) {
    if (e instanceof SecureStoreAuthError) {
      logger.info(`secure-store: ${e.message}`);
    } else {
      logger.warn(`secure-store unexpected error: ${e.message}`);
    }
  }

  throw new Error(
    `Cannot obtain token for ${hostUrl}.\n` +
    `Run: ae-cli auth login   (device code flow, cross-platform)`
  );
}
