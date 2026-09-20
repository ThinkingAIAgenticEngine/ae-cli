import { isAeSandboxRuntime } from './sandbox-runtime.js';

/** Internal builds identify whether the request comes from an Agent sandbox or a user CLI. */
export function internalCallSourceHeaders(): Record<string, string> {
  const source = isAeSandboxRuntime() ? 'te-agent' : 'ae-cli';
  return { 'X-Source': source };
}
