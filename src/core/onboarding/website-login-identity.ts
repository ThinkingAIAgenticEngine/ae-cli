import { safeJsonParse } from '../json-utils.js';
import { trustedProductHost } from './bootstrap-client.js';

/** Website-assisted login requires complete identity evidence before saving a CLI credential. */
export async function verifyWebsiteLoginIdentity(host: string, accessToken: string,
  expected: { login_name: string; company_id: string }, signal: AbortSignal): Promise<void> {
  const origin = trustedProductHost(host);
  if (!accessToken || !expected.login_name || !/^[1-9][0-9]*$/.test(expected.company_id)
    || !Number.isSafeInteger(Number(expected.company_id))) throw new Error('Website login identity is incomplete.');
  try {
    const response = await fetch(`${origin}/v1/oauth/check`, { method: 'POST', redirect: 'error', signal, body: '{}',
      headers: { Accept: 'application/json', Authorization: `bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
    const body = safeJsonParse(await response.text());
    if (!response.ok || body?.return_code !== 0 || typeof body.data?.loginName !== 'string' || body.data.cliAccessEnabled === false
      || !/^[1-9][0-9]*$/.test(String(body.data?.belongCompanyId))
      || !Number.isSafeInteger(Number(body.data.belongCompanyId))
      || body.data.loginName !== expected.login_name || String(body.data.belongCompanyId) !== expected.company_id) {
      throw new Error('Identity mismatch.');
    }
  } catch {
    signal.throwIfAborted();
    throw new Error('The website login account or company could not be verified. Credentials were not saved.');
  }
}
