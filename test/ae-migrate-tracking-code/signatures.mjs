// Shared semantic-extraction helpers for migrated AE code.
//
// Used by the E2E canary diff (`e2e/diff.mjs`) and the deterministic golden
// self-check (`migrated-signatures.test.mjs`). Extracts the semantic content of
// migrated code — event names, identity/user-property calls, and `@tracking`
// markers — across every AE SDK shape the skill can emit:
//
//   browser JS   — ta.track("e", {...});          ta.login(...);  ta.userSet({...})
//   Node server  — teSDK.track({ accountId, event: 'e', properties })
//   Java server  — te.track(userId, null, "e", props)
//   Kotlin/Swift — TDAnalytics.track("e", props); TDAnalytics.login(...)
//   React Native — TDAnalytics.track({ eventName: "e", properties })
//
// The `// @tracking <event>` marker is uniform across all shapes and is the
// primary event-name signal; track() parsing is a cross-check that the actual
// call was emitted (not just the comment).

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const MIGRATED_EXTS = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.kt', '.java', '.swift', '.dart'];

/** Event-name patterns for `track(...)` calls, one per SDK call shape. */
const TRACK_EVENT_PATTERNS = [
  // string first argument: browser / Kotlin / Swift native
  /\b(?:ta|teSDK|te|TDAnalytics)\.track\(\s*["']([^"']+)["']/g,
  // Node server: object form with `event:` key
  /\b(?:ta|teSDK|TDAnalytics)\.track\(\{[^}]*?\bevent\s*:\s*["']([^"']+)["']/g,
  // React Native: object form with `eventName:` key
  /\bTDAnalytics\.track\(\{[^}]*?\beventName\s*:\s*["']([^"']+)["']/g,
  // Java server: 3rd positional argument
  /\bte\.track\(\s*[^,]+,\s*[^,]+,\s*["']([^"']+)["']/g,
];

const AE_RECEIVERS = 'ta|teSDK|te|TDAnalytics';
const AE_CALL_METHODS = 'userSetOnce|userSet|userAdd|userAppend|userUnset|setSuperProperties|login|logout';

export function migratedSignatures(code) {
  const tracks = [];
  for (const re of TRACK_EVENT_PATTERNS) {
    for (const m of code.matchAll(re)) tracks.push(`track:${m[1]}`);
  }
  const markers = [...code.matchAll(/\/\/ @tracking\s+(\S+)/g)].map((m) => `marker:${m[1]}`);
  const calls = [
    ...code.matchAll(new RegExp(`\\b(?:${AE_RECEIVERS})\\.(${AE_CALL_METHODS})\\(`, 'g')),
  ].map((m) => `call:${m[1]}`);
  return { tracks, markers, calls };
}

/** Read all migrated code files under `dir` (recursively) and join their text. */
export async function readAllFiles(dir) {
  const files = [];
  async function walk(d) {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (MIGRATED_EXTS.some((ext) => e.name.endsWith(ext))) files.push(p);
    }
  }
  await walk(dir);
  const texts = await Promise.all(files.map((f) => readFile(f, 'utf8')));
  return texts.join('\n');
}
