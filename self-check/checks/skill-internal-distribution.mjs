/** Reject the internal page-context Skill in public CLI source packages. */

import fs from 'node:fs';
import path from 'node:path';

function isPublicPackage(pkg) {
  if (pkg.name === '@thinkingai/ae-cli') return true;
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (typeof repository !== 'string') return false;
  try {
    const url = new URL(repository.replace(/^git\+/u, '').replace(/^git@github\.com:/u, 'https://github.com/'));
    return url.hostname === 'github.com'
      && /^\/ThinkingAIAgenticEngine\/ae-cli(?:\.git)?\/?$/iu.test(url.pathname);
  } catch {
    return false;
  }
}

export function checkSkillInternalDistribution(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const findings = [];
  if (!isPublicPackage(pkg)) return { ok: true, findings };

  const relative = 'skills/ae-page-context';
  try {
    // lstat also detects a dangling symlink or a leftover file at this path.
    fs.lstatSync(path.join(root, relative));
    findings.push({
      level: 'P1',
      msg: `${relative} is internal-only and must be removed from the public export before publishing`,
      file: relative,
    });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return { ok: findings.length === 0, findings };
}

export async function run({ root }) {
  return checkSkillInternalDistribution(root);
}
