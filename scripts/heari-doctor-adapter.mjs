
// Appended to the pinned upstream doctor module by vendor-heari.mjs.
import { currentAeCredentials } from '../auth/session.mjs';

export async function doctor(values, env, directory, context, locale) {
  const local = () => standaloneDoctor(values, env, directory, context, locale);
  if (!context.aeCredentials || env.HEARI_TOKEN) return local();
  if (!values.online) {
    const report = await local();
    const check = report.checks.find(item => item.check === 'credentials');
    if (check && (check.code === 'CONFIG_MISSING' || check.code === 'CREDENTIALS_UNREADABLE')) {
      check.message += pick(locale, ' 离线诊断尚未验证 AE 免登。', ' AE sign-in has not been verified offline.');
      check.fix = 'ae-cli heari auth status --online';
    }
    return report;
  }

  let credentials;
  try {
    credentials = await currentAeCredentials(env.HEARI_ENDPOINT, context);
  } catch (error) {
    // Preserve the usual diagnostic envelope without probing a different identity.
    const baseline = await standaloneDoctor({ ...values, online: false }, {}, directory, context, locale);
    return { ...baseline, passed: false, online: true, configured: false, usable_locally: false,
      credential_source: 'ae', auth_method: 'ae', checks: [
        ...baseline.checks.filter(check => ['runtime', 'cli'].includes(check.check)),
        { check: 'authentication', status: 'FAIL', code: error.code, message: error.message, ...error.aeDiagnostic },
      ] };
  }
  if (!credentials) return local();
  // Pass the temporary credential only to the existing read-only MCP probes.
  const report = await standaloneDoctor(values, { ...env, HEARI_ENDPOINT: credentials.endpoint,
    HEARI_TOKEN: credentials.token }, directory, context, locale);
  return { ...report, credential_source: 'ae', auth_method: 'ae', endpoint: credentials.endpoint,
    checks: report.checks.filter(check => !['configuration', 'credentials'].includes(check.check)) };
}
