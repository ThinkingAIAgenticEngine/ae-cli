import { CliValidationError } from './errors.js';

/** Validate the host before sending either an evaluation session or a CLI token. */
export function resolveEvaluationHost(host: string): string {
  let endpoint: URL;
  try {
    endpoint = new URL(host);
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || /[?#\s]/.test(host)) throw new Error();
  } catch {
    throw new CliValidationError('Evaluation AE Host must be an absolute HTTP(S) URL without credentials, query, or fragment.', {
      code: 'EVAL_ENDPOINT_INVALID',
    });
  }
  const hostname = endpoint.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const mappedIpv4 = /^::ffff:([0-9a-f]+):[0-9a-f]+$/.exec(hostname);
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '::1' || hostname === '::'
    || hostname === '0.0.0.0' || hostname.startsWith('127.')
    || (mappedIpv4 && (parseInt(mappedIpv4[1], 16) >> 8) === 127) || hostname === '::ffff:0:0') {
    throw new CliValidationError('Loopback evaluation endpoints are unsupported.', {
      code: 'EVAL_ENDPOINT_LOOPBACK_UNSUPPORTED',
      hint: 'Select an online AE Host with --host.',
    });
  }
  if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
    throw new CliValidationError('Evaluation AE Host must use HTTP or HTTPS.', {
      code: 'EVAL_ENDPOINT_INVALID',
    });
  }
  return endpoint.toString().replace(/\/+$/, '').replace(/\/agent$/, '');
}
