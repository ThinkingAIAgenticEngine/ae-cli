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
