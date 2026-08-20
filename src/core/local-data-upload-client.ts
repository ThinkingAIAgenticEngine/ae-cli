import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { logger } from './logger.js';
import { LocalDataUploadError } from './errors.js';

export { LocalDataUploadError } from './errors.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface LocalDataUploadResult {
  code: 0;
  message: string;
  http_status: number;
  request_bytes: number;
  response_bytes: number;
}

export interface LocalDataUploadRequestOptions {
  /** Test-only override. Production callers use the fixed 30-second timeout. */
  timeoutMs?: number;
  /** Test-only transport injection. */
  fetchImpl?: typeof fetch;
  /** Retry count for network failures, aborts, and HTTP >= 500. Default 0 (no retry). */
  retries?: number;
  /** Backoff delay between retries in milliseconds. Default 2000. */
  retryDelayMs?: number;
  /** gzip-compress the request body (Content-Encoding: gzip). */
  compress?: 'gzip';
}

/**
 * Submit one losslessly assembled UE batch without AE authentication or redirects. When
 * `retries` is set, network failures, aborts, and HTTP >= 500 responses are retried with a
 * fixed backoff; 4xx, non-zero receiver codes, redirects, and invalid responses are not retried.
 */
export async function localDataUpload(
  endpoint: string,
  rawBody: string,
  options: LocalDataUploadRequestOptions = {},
): Promise<LocalDataUploadResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 2000;
  const compress = options.compress === 'gzip';
  const body: string | Uint8Array = compress ? gzipSync(rawBody) : rawBody;
  const requestBytes = Buffer.byteLength(rawBody, 'utf8');

  let attempt = 0;
  while (true) {
    try {
      return await performAttempt(endpoint, body, { timeoutMs, fetchImpl, requestBytes, compress });
    } catch (error) {
      if (!(error instanceof LocalDataUploadError) || attempt >= retries || !isRetryable(error)) {
        throw stampRetryMeta(error, attempt);
      }
      attempt += 1;
      await sleep(retryDelayMs);
    }
  }
}

async function performAttempt(
  endpoint: string,
  body: string | Uint8Array,
  options: { timeoutMs: number; fetchImpl: typeof fetch; requestBytes: number; compress: boolean },
): Promise<LocalDataUploadResult> {
  const { timeoutMs, fetchImpl, requestBytes, compress } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response | undefined;
  let responseText = '';
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(compress ? { 'Content-Encoding': 'gzip' } : {}),
      },
      body,
      redirect: 'manual',
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (error) {
    const timedOut = controller.signal.aborted || isAbortError(error);
    logUpload(endpoint, response?.status ?? 'unavailable', requestBytes, 0);
    throw new LocalDataUploadError(
      timedOut
        ? `Local data upload timed out after ${timeoutMs} ms. Delivery state is unknown.`
        : 'Local data upload failed before a response was received. Delivery state is unknown.',
      {
        code: timedOut ? 'LOCAL_DATA_UPLOAD_TIMEOUT' : 'LOCAL_DATA_UPLOAD_NETWORK_ERROR',
        hint: 'Verify receiver data before choosing a resume position.',
        meta: { delivery_state: 'unknown', persistence_verified: false, retry_attempted: false },
        cause: error,
      },
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseBytes = Buffer.byteLength(responseText, 'utf8');
  logUpload(endpoint, response.status, requestBytes, responseBytes);
  if (response.status >= 300 && response.status < 400) {
    throw new LocalDataUploadError('Receiver redirect was rejected and was not followed.', {
      code: 'LOCAL_DATA_UPLOAD_REDIRECT_REJECTED',
      httpStatus: response.status,
      meta: safeMeta(requestBytes, responseBytes, 'not_accepted'),
    });
  }

  if (!response.ok) {
    throw new LocalDataUploadError(`Receiver returned HTTP ${response.status}.`, {
      code: `LOCAL_DATA_UPLOAD_HTTP_${response.status}`,
      httpStatus: response.status,
      hint: response.status >= 500 ? 'Check receiver logs.' : undefined,
      meta: safeMeta(requestBytes, responseBytes, 'rejected'),
    });
  }
  const responseBody = parseResponse(responseText, response.status);
  if (!isRecord(responseBody) || typeof responseBody.code !== 'number') {
    throw new LocalDataUploadError('Receiver returned an invalid response without numeric code.', {
      code: 'LOCAL_DATA_UPLOAD_INVALID_RESPONSE',
      httpStatus: response.status,
      meta: safeMeta(requestBytes, responseBytes, 'unknown'),
    });
  }
  if (responseBody.code !== 0) {
    throw new LocalDataUploadError('Receiver rejected the UE batch.', {
      code: responseBody.code,
      httpStatus: response.status,
      meta: safeMeta(requestBytes, responseBytes, 'rejected'),
    });
  }

  return {
    code: 0,
    message: typeof responseBody.msg === 'string' ? responseBody.msg : 'success',
    http_status: response.status,
    request_bytes: requestBytes,
    response_bytes: responseBytes,
  };
}

function parseResponse(text: string, status: number): unknown {
  if (!text.trim()) {
    throw new LocalDataUploadError('Receiver returned an empty response.', {
      code: 'LOCAL_DATA_UPLOAD_INVALID_RESPONSE',
      httpStatus: status,
      meta: { delivery_state: 'unknown', persistence_verified: false, retry_attempted: false },
    });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new LocalDataUploadError('Receiver returned a non-JSON response.', {
      code: 'LOCAL_DATA_UPLOAD_INVALID_RESPONSE',
      httpStatus: status,
      meta: { delivery_state: 'unknown', persistence_verified: false, retry_attempted: false },
    });
  }
}

function isRetryable(error: LocalDataUploadError): boolean {
  if (error.code === 'LOCAL_DATA_UPLOAD_TIMEOUT' || error.code === 'LOCAL_DATA_UPLOAD_NETWORK_ERROR') return true;
  return typeof error.code === 'string'
    && error.code.startsWith('LOCAL_DATA_UPLOAD_HTTP_')
    && (error.httpStatus ?? 0) >= 500;
}

function stampRetryMeta(error: unknown, attempt: number): unknown {
  if (!(error instanceof LocalDataUploadError) || attempt === 0) return error;
  return new LocalDataUploadError(error.message, {
    code: error.code,
    httpStatus: error.httpStatus,
    hint: error.hint,
    meta: { ...error.meta, retry_attempted: true, retry_count: attempt },
    cause: error.cause,
  });
}

function safeMeta(requestBytes: number, responseBytes: number, deliveryState: string): Record<string, unknown> {
  return {
    request_bytes: requestBytes,
    response_bytes: responseBytes,
    delivery_state: deliveryState,
    persistence_verified: false,
    retry_attempted: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logUpload(
  endpoint: string,
  status: number | 'unavailable',
  requestBytes: number,
  responseBytes: number,
): void {
  const targetFingerprint = createHash('sha256').update(endpoint).digest('hex').slice(0, 12);
  logger.info(
    `LOCAL_DATA_UPLOAD target_sha256=${targetFingerprint} status=${status} request_bytes=${requestBytes} response_bytes=${responseBytes}`,
  );
}
