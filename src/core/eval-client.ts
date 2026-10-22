import { logger } from './logger.js';
import { open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliValidationError } from './errors.js';
import { resolveEvaluationHost } from './eval-endpoint.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface EvalApiErrorOptions {
  code: string;
  httpStatus: number;
  hint?: string;
  details?: Record<string, unknown>;
  sensitiveValues?: string[];
}

export class EvalApiError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly hint?: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, options: EvalApiErrorOptions) {
    const redact = evaluationErrorRedactor([
      ...(options.sensitiveValues ?? []),
      process.env.AE_EVAL_ACCESS_TOKEN ?? '',
    ]);
    super(redact(message));
    this.name = 'EvalApiError';
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.hint = options.hint === undefined ? undefined : redact(options.hint);
    this.details = options.details === undefined ? undefined : redact(options.details);
  }
}

/** Redact request-scoped credentials, including common serialized and URL-encoded forms. */
function evaluationErrorRedactor(secrets: string[]) {
  const forms = [...new Set(secrets.filter(Boolean).flatMap((secret) => [
    secret, JSON.stringify(secret).slice(1, -1), encodeURIComponent(secret),
  ]))].sort((a, b) => b.length - a.length);
  const redact = (value: any): any => {
    if (typeof value === 'string') {
      for (const secret of forms) value = value.split(secret).join('[REDACTED]');
      return value;
    }
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [redact(key), redact(item)]));
    }
    return value;
  };
  return redact;
}

export interface EvalRequestOptions {
  baseUrl: string;
  headers: Record<string, string>;
  method: string;
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  idempotencyKey?: string;
  responseType?: 'json' | 'bytes';
  /** Test-only overrides. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * One authenticated request to the Agent Evaluation platform (/agenteval/api/v1).
 *
 * Transport is deliberately plain: no redirect following, no retry loop. Authentication headers are
 * supplied by the caller. Non-2xx responses are parsed into the platform's `{ error: { code,
 * message, details } }` envelope and rethrown as EvalApiError.
 */
export async function evalRequest(options: EvalRequestOptions): Promise<any> {
  const url = buildEvalUrl(options.baseUrl, options.path, options.params);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    ...options.headers,
    Accept: options.responseType === 'bytes' ? 'application/octet-stream, application/json' : 'application/json',
  };
  const isMultipart = options.body instanceof FormData;
  if (options.body !== undefined && !isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  let response: Response | undefined;
  let responseText = '';
  let bytes: Uint8Array | undefined;
  try {
    response = await fetchImpl(url, {
      method: options.method,
      headers,
      body: options.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
      redirect: 'error',
      signal: controller.signal,
    });
    if (response.ok && options.responseType === 'bytes') {
      bytes = new Uint8Array(await response.arrayBuffer());
    } else {
      responseText = await response.text();
    }
  } catch (error) {
    const timedOut = controller.signal.aborted || (error instanceof Error && error.name === 'AbortError');
    logEvalRequest(options.method, url, response?.status ?? 'unavailable');
    if (timedOut) {
      throw new EvalApiError(`Evaluation API request timed out after ${timeoutMs} ms.`, {
        code: 'EVAL_API_TIMEOUT',
        httpStatus: 0,
        hint: 'Verify the evaluation platform is reachable at the configured endpoint.',
      });
    }
    throw new EvalApiError('Evaluation API request failed before a response was received.', {
      code: 'EVAL_API_NETWORK_ERROR',
      httpStatus: 0,
      hint: 'Verify the --endpoint URL and network path.',
    });
  } finally {
    clearTimeout(timeout);
  }

  logEvalRequest(options.method, url, response.status);
  if (bytes !== undefined) return bytes;
  const responseBody = parseEvalResponseBody(responseText, response.status);

  if (!response.ok) {
    const sensitiveValues = Object.values(options.headers).flatMap((value) => [value, value.replace(/^Bearer\s+/i, '')]);
    if (isRecord(options.body)) {
      for (const key of ['secret', 'data_token', 'report_source']) {
        if (typeof options.body[key] === 'string') sensitiveValues.push(options.body[key]);
      }
    }
    throw evalErrorFromBody(responseBody, response.status, sensitiveValues);
  }

  return responseBody;
}

/** Save authenticated attachment bytes without overwriting an existing file. */
export async function evalDownloadFile(options: EvalRequestOptions, outputPath: string) {
  const path = resolve(outputPath);
  let file;
  try {
    file = await open(path, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new CliValidationError('Output file already exists; choose a new --output path.', {
        code: 'EVAL_OUTPUT_EXISTS',
      });
    }
    throw error;
  }
  let completed = false;
  try {
    const bytes: Uint8Array = await evalRequest({ ...options, responseType: 'bytes' });
    await file.writeFile(bytes);
    completed = true;
    return { path, byte_size: bytes.byteLength };
  } finally {
    await file.close();
    if (!completed) await unlink(path);
  }
}

function buildEvalUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, unknown>,
): string {
  const base = resolveEvaluationHost(baseUrl);
  const url = new URL(`${base}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function parseEvalResponseBody(text: string, httpStatus: number): any {
  if (!text.trim()) {
    if (httpStatus === 204) return undefined;
    throw new EvalApiError('Evaluation API returned an empty response body.', {
      code: 'EVAL_API_INVALID_RESPONSE',
      httpStatus,
    });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new EvalApiError('Evaluation API returned a non-JSON response body.', {
      code: 'EVAL_API_INVALID_RESPONSE',
      httpStatus,
    });
  }
}

function evalErrorFromBody(body: any, httpStatus: number, sensitiveValues: string[]): EvalApiError {
  const error = body?.error;
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return new EvalApiError(error.message.trim(), {
      code: typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/.test(error.code)
        ? error.code : `EVAL_API_HTTP_${httpStatus}`,
      httpStatus,
      hint: typeof error.details === 'string' ? error.details : undefined,
      details: isRecord(error.details) ? error.details : undefined,
      sensitiveValues,
    });
  }
  return new EvalApiError(`Evaluation API returned HTTP ${httpStatus}.`, {
    code: `EVAL_API_HTTP_${httpStatus}`,
    httpStatus,
    hint: httpStatus >= 500
      ? 'The server response was suppressed. Check the evaluation platform logs; the CLI did not retry.'
      : undefined,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function logEvalRequest(method: string, url: string, status: number | 'unavailable'): void {
  logger.info(`EVAL ${method} ${redactEvalLogUrl(url)} status=${status}`);
}

/** Preserve request routing diagnostics without persisting query values or URL credentials. */
export function redactEvalLogUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '[invalid evaluation URL]';
  }
}
