/**
 * Release / self-check: skills/<name>/SKILL.md frontmatter must be YAML-safe for
 * external hubs (`npx skills add`), which parse description as YAML.
 *
 * Export used by release-gate and self-check/scan.mjs (D4d).
 */

import fs from 'fs';
import path from 'path';

/**
 * @param {string} root te-cli repo root
 * @returns {{ ok: boolean, findings: Array<{ level: string, dim: string, msg: string, skill?: string, file?: string }> }}
 */
export function checkSkillFrontmatter(root) {
  const findings = [];
  const skillsRoot = path.join(root, 'skills');
  if (!fs.existsSync(skillsRoot)) {
    findings.push({
      level: 'P1',
      dim: 'D4',
      msg: 'skills/ directory is missing',
    });
    return { ok: false, findings };
  }

  for (const skill of fs.readdirSync(skillsRoot)) {
    const sdir = path.join(skillsRoot, skill);
    if (!fs.statSync(sdir).isDirectory()) continue;
    const file = path.join(sdir, 'SKILL.md');
    if (!fs.existsSync(file)) {
      findings.push({
        level: 'P2',
        dim: 'D4',
        skill,
        file,
        msg: `skill '${skill}' is missing SKILL.md`,
      });
      continue;
    }

    const skillMd = fs.readFileSync(file, 'utf8');
    const fm = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) {
      findings.push({
        level: 'P1',
        dim: 'D4',
        skill,
        file,
        msg: `skill '${skill}' SKILL.md is missing YAML frontmatter (--- ... ---)`,
      });
      continue;
    }

    const body = fm[1];
    const nameMatch = body.match(/^name:\s*(.+)$/m);
    const descLineMatch = body.match(/^description:\s*(.*)$/m);

    const nameVal = nameMatch ? nameMatch[1].trim() : '';
    if (!nameVal) {
      findings.push({
        level: 'P1',
        dim: 'D4',
        skill,
        file,
        msg: `skill '${skill}' SKILL.md frontmatter is missing non-empty name`,
      });
    }

    if (!descLineMatch) {
      findings.push({
        level: 'P1',
        dim: 'D4',
        skill,
        file,
        msg: `skill '${skill}' SKILL.md frontmatter is missing description`,
      });
      continue;
    }

    const val = descLineMatch[1];
    if (!val.trim()) {
      findings.push({
        level: 'P1',
        dim: 'D4',
        skill,
        file,
        msg: `skill '${skill}' SKILL.md description is empty`,
      });
      continue;
    }

    const startsDq = val.startsWith('"');
    const endsDq = val.endsWith('"') && val.length > 1;
    const startsSq = val.startsWith("'");
    const endsSq = val.endsWith("'") && val.length > 1;
    const block = val === '>' || val === '|';

    // Mismatched quotes (e.g. removed only the opening "): hubs / YAML will mis-parse.
    if ((startsDq && !endsDq) || (!startsDq && endsDq) || (startsSq && !endsSq) || (!startsSq && endsSq)) {
      findings.push({
        level: 'P1',
        dim: 'D4',
        skill,
        file,
        msg:
          `skill '${skill}' SKILL.md description has mismatched quotes — ` +
          `use matching "..." or '...' (or > / | block)`,
      });
      continue;
    }

    const quoted = (startsDq && endsDq) || (startsSq && endsSq) || block;

    // Always require quotes / block scalar so future ": " / "#" edits cannot sneak in as plain YAML.
    if (!quoted) {
      findings.push({
        level: 'P1',
        dim: 'D4',
        skill,
        file,
        msg:
          `skill '${skill}' SKILL.md description must be a quoted string ("..." / '...') or > / | block — ` +
          `plain scalars break external YAML parsers when they later gain ": " or #`,
      });
      continue;
    }
  }

  return { ok: !findings.some((f) => f.level === 'P1'), findings };
}

/**
 * Release-gate adapter.
 * @param {{ root: string }} ctx
 */
export async function run({ root }) {
  return checkSkillFrontmatter(root);
}
