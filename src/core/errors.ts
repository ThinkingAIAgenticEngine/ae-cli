/**
 * Shared error types for structured classification by the runner.
 *
 * Why: the runner used to classify errors by substring-matching the message ("token"/"auth"/"403"),
 * which mislabeled permission denials (403) as session-expiry and prompted a useless re-login (F-016/F-018).
 * Producers should throw a typed error so the runner can classify by `instanceof`, not by text.
 */

/**
 * Authenticated-but-forbidden (HTTP 403 / permission or scope denied). NOT an expired session —
 * re-login will not help. The runner surfaces this as `type: 'permission'` and does NOT suggest re-login.
 */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/** Safe structural location for a CLI validation error; never include the rejected value. */
export interface CliValidationLocation {
  segment?: number;
  record?: number;
  field?: string;
}

export interface CliValidationErrorOptions {
  code?: string | number;
  hint?: string;
  location?: CliValidationLocation;
}

/**
 * A local input error that the runner renders with the validation envelope.
 *
 * Callers may identify the segment, record, and field, but must not include raw business values
 * in the message, hint, or location.
 */
export class CliValidationError extends Error {
  readonly code?: string | number;
  readonly hint?: string;
  readonly location?: CliValidationLocation;

  constructor(message: string, options: CliValidationErrorOptions = {}) {
    super(message);
    this.name = 'CliValidationError';
    this.code = options.code;
    this.hint = options.hint;

    if (options.location) {
      const location: CliValidationLocation = {};
      if (typeof options.location.segment === 'number' && Number.isFinite(options.location.segment)) {
        location.segment = options.location.segment;
      }
      if (typeof options.location.record === 'number' && Number.isFinite(options.location.record)) {
        location.record = options.location.record;
      }
      if (typeof options.location.field === 'string' && options.location.field.length > 0) {
        location.field = options.location.field;
      }
      if (Object.keys(location).length > 0) this.location = location;
    }
  }
}

export interface CommunityReportErrorOptions {
  code?: string | number;
  httpStatus?: number;
  hint?: string;
  meta?: Record<string, unknown>;
  cause?: unknown;
}

/** A transport or Iris business-envelope failure from the unauthenticated ingestion endpoint. */
export class CommunityReportError extends Error {
  readonly code?: string | number;
  readonly httpStatus?: number;
  readonly hint?: string;
  readonly meta?: Record<string, unknown>;

  constructor(message: string, options: CommunityReportErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CommunityReportError';
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.hint = options.hint;
    this.meta = options.meta;
  }
}
