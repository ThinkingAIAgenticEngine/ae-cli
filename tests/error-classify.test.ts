/**
 * error-classify unit tests (F-018)
 *
 * Run:
 *   npx tsx tests/error-classify.test.ts
 *
 * Covers the runner's narrow auth-failure fallback (used for plain Errors): genuine token/session
 * failures (401 / -1001 / invalid access token) → auth+relogin; permission denials (403/forbidden)
 * → NOT auth. Typed errors (PermissionError / SecureStoreAuthError / TeAgentApiError) are classified
 * by instanceof in the runner and are not exercised here.
 */

import assert from 'node:assert/strict';
import { looksLikeAuthFailure } from '../src/framework/runner.ts';
import { PermissionError } from '../src/core/errors.ts';

let pass = 0, fail = 0;
function test(name: string, fn: () => void) {
  try { fn(); pass++; process.stdout.write(`  ✓ ${name}\n`); }
  catch (e) { fail++; process.stdout.write(`  ✗ ${name}\n    ${e instanceof Error ? e.message : String(e)}\n`); }
}

process.stdout.write('\nerror-classify tests\n');

// genuine auth/session failures → true
test('401 → auth', () => assert.equal(looksLikeAuthFailure('MCP HTTP error: 401 Unauthorized'), true));
test('-1001 invalid access token → auth', () => assert.equal(looksLikeAuthFailure('MCP token generate error: ...InsufficientAuthenticationException: Invalid access token: x (code: -1001)'), true));
test('session expired → auth', () => assert.equal(looksLikeAuthFailure('Session expired or unauthorized for host. Please run: ae-cli auth login'), true));
test('cannot obtain token (hints ae-cli auth login) → auth', () => assert.equal(looksLikeAuthFailure('Cannot obtain token. Options: 1. ae-cli auth login'), true));

// permission / non-auth → false (must NOT prompt re-login)
test('403 Forbidden → NOT auth', () => assert.equal(looksLikeAuthFailure('MCP HTTP error: 403 Forbidden'), false));
test('permission message → NOT auth', () => assert.equal(looksLikeAuthFailure('Permission denied for this resource (HTTP 403)'), false));
test('forbidden wording → NOT auth', () => assert.equal(looksLikeAuthFailure('Forbidden: insufficient scope'), false));
test('plain API error → NOT auth', () => assert.equal(looksLikeAuthFailure('AE API error: something (code: 5)'), false));

// PermissionError is a real Error subclass (runner classifies it via instanceof → type:permission)
test('PermissionError instanceof Error', () => {
  const e = new PermissionError('无权删除此模型');
  assert.ok(e instanceof PermissionError && e instanceof Error);
  assert.equal(e.message, '无权删除此模型');
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
