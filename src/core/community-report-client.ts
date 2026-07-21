import { logger } from './logger.js';
import { CommunityReportError } from './errors.js';

export { CommunityReportError } from './errors.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface CommunityReportResult {
  return_code: 0;
  return_message: string;
  http_status: number;
  request_bytes: number;
  response_bytes: number;
}

export interface CommunityReportRequestOptions {
  /** Test-only override. Production callers use the fixed 30-second timeout. */
  timeoutMs?: number;
  /** Test-only transport injection. */
  fetchImpl?: typeof fetch;
}

/**
 * Submit one raw, losslessly serialized #standard/5.0.0 request to Iris.
 *
 * This transport deliberately has no authentication integration, redirect following, or retry
 * loop. Logs contain only the validated URL, HTTP status, and byte counts.
 */
export async function communityReport(
  endpoint: string,
  rawBody: string,
  options: CommunityReportRequestOptions = {},
): Promise<CommunityReportResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestBytes = Buffer.byteLength(rawBody, 'utf8');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response | undefined;
  let responseText: string;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: rawBody,
      redirect: 'error',
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (error) {
    const timedOut = controller.signal.aborted || isAbortError(error);
    logCommunityReport(endpoint, response?.status ?? 'unavailable', requestBytes, 0);
    if (timedOut) {
      throw new CommunityReportError(
        `Community data report timed out after ${timeoutMs} ms. Delivery state is unknown.`,
        {
          code: 'COMMUNITY_REPORT_TIMEOUT',
          hint: 'Check downstream query or storage before deciding whether to submit again. The CLI did not retry.',
          meta: { persistence_verified: false, retry_attempted: false },
          cause: error,
        },
      );
    }
    throw new CommunityReportError('Community data report request failed before a response was received.', {
      code: 'COMMUNITY_REPORT_NETWORK_ERROR',
      hint: 'Verify the endpoint and network path. The CLI did not retry.',
      meta: { persistence_verified: false, retry_attempted: false },
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }

  const responseBytes = Buffer.byteLength(responseText, 'utf8');
  logCommunityReport(endpoint, response.status, requestBytes, responseBytes);

  const responseBody = parseResponseBody(responseText, response.status);
  if (!response.ok) {
    if (response.status === 400) {
      const returnMessage = getReturnMessage(responseBody);
      throw new CommunityReportError(returnMessage ?? 'Iris rejected the community data report.', {
        code: getReturnCode(responseBody) ?? 'COMMUNITY_REPORT_HTTP_400',
        httpStatus: response.status,
        meta: safeResponseMeta(requestBytes, responseBytes),
      });
    }
    throw new CommunityReportError(`Iris sync endpoint returned HTTP ${response.status}.`, {
      code: `COMMUNITY_REPORT_HTTP_${response.status}`,
      httpStatus: response.status,
      hint: response.status >= 500
        ? 'The server response was suppressed. Check Iris or gateway logs; the CLI did not retry.'
        : undefined,
      meta: safeResponseMeta(requestBytes, responseBytes),
    });
  }

  if (!isRecord(responseBody) || typeof responseBody.return_code !== 'number') {
    throw new CommunityReportError('Iris sync endpoint returned an invalid API response: missing numeric return_code.', {
      code: 'COMMUNITY_REPORT_INVALID_RESPONSE',
      httpStatus: response.status,
      meta: safeResponseMeta(requestBytes, responseBytes),
    });
  }
  if (responseBody.return_code !== 0) {
    throw new CommunityReportError(
      getReturnMessage(responseBody) ?? 'Iris rejected the community data report.',
      {
        code: responseBody.return_code,
        httpStatus: response.status,
        meta: safeResponseMeta(requestBytes, responseBytes),
      },
    );
  }

  return {
    return_code: 0,
    return_message: getReturnMessage(responseBody) ?? 'success',
    http_status: response.status,
    request_bytes: requestBytes,
    response_bytes: responseBytes,
  };
}

function parseResponseBody(text: string, httpStatus: number): unknown {
  if (!text.trim()) {
    if (httpStatus >= 500) return undefined;
    throw new CommunityReportError('Iris sync endpoint returned an empty API response.', {
      code: 'COMMUNITY_REPORT_INVALID_RESPONSE',
      httpStatus,
    });
  }
  try {
    return JSON.parse(text);
  } catch {
    if (httpStatus >= 500) return undefined;
    throw new CommunityReportError('Iris sync endpoint returned a non-JSON API response.', {
      code: 'COMMUNITY_REPORT_INVALID_RESPONSE',
      httpStatus,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getReturnCode(value: unknown): string | number | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value.return_code === 'number' || typeof value.return_code === 'string'
    ? value.return_code
    : undefined;
}

function getReturnMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value.return_message === 'string' && value.return_message.trim()
    ? value.return_message.trim()
    : undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function safeResponseMeta(requestBytes: number, responseBytes: number): Record<string, unknown> {
  return {
    request_bytes: requestBytes,
    response_bytes: responseBytes,
    persistence_verified: false,
    retry_attempted: false,
  };
}

function logCommunityReport(
  endpoint: string,
  status: number | 'unavailable',
  requestBytes: number,
  responseBytes: number,
): void {
  logger.info(
    `COMMUNITY_REPORT POST ${endpoint} status=${status} request_bytes=${requestBytes} response_bytes=${responseBytes}`,
  );
}
