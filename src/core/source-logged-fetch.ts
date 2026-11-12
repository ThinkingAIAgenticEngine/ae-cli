import { randomUUID } from 'node:crypto';
import { logger } from './logger.js';
import { getLocalCliPackageInfo } from './package-info.js';
import { getAeSandboxDetectionReason } from './sandbox-runtime.js';

export const CLI_REQUEST_ID_HEADER = 'X-TA-CLI-Request-Id';
const localPackage = getLocalCliPackageInfo();
const MAX_LOG_VALUE_LENGTH = 256;

function bounded(value: string): string {
  return value.length > MAX_LOG_VALUE_LENGTH ? `${value.slice(0, MAX_LOG_VALUE_LENGTH)}...[truncated]` : value;
}

/** Log the final outgoing source, including public builds that omit it. Never inspect credentials or bodies. */
export function sourceLoggedFetch(url: string, init: RequestInit): Promise<Response> {
  const requestId = randomUUID();
  let headers: HeadersInit;
  if (init.headers instanceof Headers) {
    headers = new Headers(init.headers);
    headers.set(CLI_REQUEST_ID_HEADER, requestId);
  } else if (Array.isArray(init.headers)) {
    headers = [...init.headers.filter(([name]) => name.toLowerCase() !== CLI_REQUEST_ID_HEADER.toLowerCase()),
      [CLI_REQUEST_ID_HEADER, requestId]];
  } else {
    headers = Object.fromEntries(Object.entries(init.headers ?? {})
      .filter(([name]) => name.toLowerCase() !== CLI_REQUEST_ID_HEADER.toLowerCase()));
    headers[CLI_REQUEST_ID_HEADER] = requestId;
  }
  const request = { ...init, headers };
  try {
    const target = new URL(url);
    const actualHeaders = new Headers(headers);
    const source = actualHeaders.get('X-Source');
    const sandboxDetection = getAeSandboxDetectionReason();
    logger.info(`CLI_SOURCE_SEND ${JSON.stringify({
      request_id: requestId,
      method: init.method ?? 'GET',
      host: bounded(target.host),
      path: bounded(target.pathname),
      source: source === null ? null : bounded(source),
      source_state: source === null ? 'missing' : source === '' ? 'empty' : source.includes(',') ? 'multiple' : 'present',
      cli_package: localPackage.name,
      cli_version: localPackage.version,
      sandbox_detected: sandboxDetection !== 'not_detected',
      sandbox_detection: sandboxDetection,
    })}`);
  } catch {
    // Diagnostic failures must not interrupt an authorized request.
  }
  return fetch(url, request);
}
