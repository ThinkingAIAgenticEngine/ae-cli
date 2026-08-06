#!/usr/bin/env node
/**
 * Release gate: blocking checks that must pass before ae-cli publish.
 *
 * Usage:
 *   node self-check/release-gate.mjs
 *   npm run check:release
 *
 * Exit 1 if any registered check reports a P1 finding.
 *
 * Add future gates by creating self-check/checks/<name>.mjs that exports
 * `run({ root }) => { ok, findings }` and appending <name> to RELEASE_CHECKS.
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Ordered list of checks under ./checks/<id>.mjs */
const RELEASE_CHECKS = [
  'skill-frontmatter',
  'skill-risk-examples',
  'skill-preset-mcp',
  // 'command-format', // future
];

async function loadCheck(id) {
  const modPath = path.join(ROOT, 'self-check', 'checks', `${id}.mjs`);
  const mod = await import(pathToFileURL(modPath).href);
  if (typeof mod.run !== 'function') {
    throw new Error(`check '${id}' must export async function run({ root })`);
  }
  return mod;
}

async function main() {
  console.log('\n  te-cli release-gate\n');
  let failed = false;
  const allFindings = [];

  for (const id of RELEASE_CHECKS) {
    console.log(`  ▶ ${id}`);
    const check = await loadCheck(id);
    const result = await check.run({ root: ROOT });
    const findings = result?.findings || [];
    allFindings.push(...findings.map((f) => ({ ...f, check: id })));

    const p1 = findings.filter((f) => f.level === 'P1');
    if (p1.length) {
      failed = true;
      for (const f of p1) {
        console.log(`    ✗ ${f.msg}`);
      }
    } else if (!result?.ok) {
      failed = true;
      console.log(`    ✗ check returned ok=false`);
    } else {
      const warn = findings.filter((f) => f.level !== 'P1');
      if (warn.length) {
        for (const f of warn) {
          console.log(`    · [${f.level}] ${f.msg}`);
        }
      }
      console.log(`    ✓ pass`);
    }
  }

  if (failed) {
    console.log('\n  release-gate FAILED — fix P1 issues before publish\n');
    process.exit(1);
  }

  console.log(`\n  release-gate OK (${RELEASE_CHECKS.length} check(s))\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
