import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = 'docs/skill-contracts/collaboration.md';
// Package participants only; never used as a runtime route or authorization list.
const PARTICIPANTS = [
  'ae-analysis', 'ae-capability', 'ae-community', 'ae-data-integration', 'ae-dataops',
  'ae-engage', 'ae-generate-tracking-plan', 'ae-kb', 'ae-kb-discovery', 'ae-metadata',
];

export function syncSkillCollaboration({ root = ROOT, check = false } = {}) {
  const source = fs.readFileSync(path.join(root, SOURCE), 'utf8');
  if (!source.trim()) throw new Error(`${SOURCE} must not be empty`);
  const expected = `<!-- Generated from ${SOURCE}. Do not edit; run npm run sync:skill-collaboration. -->\n\n${source}`;
  const findings = [];
  const written = [];
  // Validate the whole distribution before writing any package.
  for (const name of PARTICIPANTS) {
    const skillPath = `skills/${name}/SKILL.md`;
    try {
      for (const relative of ['skills', `skills/${name}`, skillPath,
        `skills/${name}/references`, `skills/${name}/references/collaboration.md`]) {
        const info = fs.lstatSync(path.join(root, relative), { throwIfNoEntry: false });
        if (info?.isSymbolicLink()) throw new Error(`${relative} must not be a symlink`);
      }
      const skill = fs.readFileSync(path.join(root, skillPath), 'utf8');
      if (!/\[[^\]\n]+\]\(references\/collaboration\.md\)/u.test(skill)) {
        throw new Error(`${skillPath} must link to references/collaboration.md`);
      }
    } catch (error) {
      findings.push({ level: 'P1', file: skillPath, msg: error.message });
    }
  }
  if (findings.length) return { ok: false, findings, written };
  for (const name of PARTICIPANTS) {
    const relative = `skills/${name}/references/collaboration.md`;
    const target = path.join(root, relative);
    let current;
    try {
      current = fs.readFileSync(target, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (current === expected) continue;
    if (check) {
      findings.push({ level: 'P1', file: relative, msg: `${relative} is missing or stale; run npm run sync:skill-collaboration` });
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, expected);
      written.push(relative);
    }
  }
  return { ok: findings.length === 0, findings, written };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== '--check')) {
      throw new Error('Usage: node scripts/sync-skill-collaboration.mjs [--check]');
    }
    const result = syncSkillCollaboration({ check: process.argv.includes('--check') });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
