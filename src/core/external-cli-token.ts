import fs from 'node:fs';
import { normalizeUrl } from './url-utils.js';

export class ExternalCliTokenError extends Error {
  readonly hint = 'Set AE_CLI_TOKEN with AE_CLI_TOKEN_HOST, or use a JSON CLI token file containing url and token. Remove external token settings to use stored accounts.';

  constructor(message: string, readonly code = 'EXTERNAL_CLI_TOKEN_INVALID') {
    super(message);
    this.name = 'ExternalCliTokenError';
  }
}

export interface ExternalCliToken {
  url: string;
  token: string;
  source: 'environment-cli-token' | 'file-cli-token';
}

let explicitTokenFile: string | undefined;
const diagnosticSecrets = new Set<string>();

/** Configure the global file option before startup probes read credentials. */
export function setExternalCliTokenFile(file: string | undefined): void {
  explicitTokenFile = file;
}

function normalizedHost(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ExternalCliTokenError('The external CLI token requires a host URL.');
  }
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname
      || url.username || url.password || url.search || url.hash || /\s/.test(value)) throw new Error();
    return normalizeUrl(url.toString());
  } catch {
    throw new ExternalCliTokenError('The external CLI token host must be an HTTP(S) URL without credentials, query, or fragment.');
  }
}

function credential(url: unknown, value: unknown, source: ExternalCliToken['source']): ExternalCliToken {
  if (typeof value !== 'string' || !/^cli_[!-~]+$/.test(value.trim())) {
    throw new ExternalCliTokenError('The external CLI token must be a non-empty ASCII cli_ token without whitespace.');
  }
  return { url: normalizedHost(url), token: value.trim(), source };
}

/** Explicit sources never fall back to stored accounts, including on malformed input. */
export function readExternalCliToken(hostOverride?: string): ExternalCliToken | undefined {
  let entry: ExternalCliToken | undefined;
  const file = explicitTokenFile ?? (process.env.AE_CLI_TOKEN === undefined ? process.env.AE_CLI_TOKEN_FILE : undefined);
  if (file !== undefined) {
    if (!file.trim()) throw new ExternalCliTokenError('The external CLI token file path is empty.');
    let data: any;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 64 * 1024) throw new Error();
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      throw new ExternalCliTokenError('The external CLI token file must be a readable JSON file no larger than 64 KiB.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ExternalCliTokenError('The external CLI token file must contain an object with url and token.');
    }
    entry = credential(data.url, data.token ?? data['cli-token'], 'file-cli-token');
  } else if (process.env.AE_CLI_TOKEN !== undefined) {
    entry = credential(process.env.AE_CLI_TOKEN_HOST, process.env.AE_CLI_TOKEN, 'environment-cli-token');
  } else if (process.env.AE_CLI_TOKEN_HOST !== undefined) {
    throw new ExternalCliTokenError('AE_CLI_TOKEN_HOST requires AE_CLI_TOKEN.');
  }
  if (entry && hostOverride && normalizedHost(hostOverride) !== entry.url) {
    throw new ExternalCliTokenError('The selected host does not match the external CLI token host.');
  }
  if (entry) diagnosticSecrets.add(entry.token);
  return entry;
}

/** Keep explicit host-bound credentials on that origin, including through redirects. */
export function externalCliTokenRequestOptions(destination: string): Pick<RequestInit, 'redirect'> {
  const external = readExternalCliToken();
  if (!external) return {};
  if (new URL(destination).origin !== new URL(external.url).origin) {
    throw new ExternalCliTokenError('The request destination does not match the external CLI token host.');
  }
  return { redirect: 'error' };
}

/** Remove the selected secret from diagnostics, including serialized or URL-encoded forms. */
export function redactExternalCliToken(value: string): string {
  try { readExternalCliToken(); } catch { /* Retain redaction when the selected source was rotated or removed. */ }
  const forms = [...diagnosticSecrets].flatMap(token => [token, JSON.stringify(token).slice(1, -1), encodeURIComponent(token)]);
  for (const form of [...new Set(forms)].sort((a, b) => b.length - a.length)) value = value.split(form).join('[REDACTED]');
  return value;
}
