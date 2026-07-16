/**
 * release-gate / skill-frontmatter unit checks
 * Run: node test/release-gate-skill-frontmatter.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSkillFrontmatter } from '../self-check/checks/skill-frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function withTempSkills(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-skill-fm-'));
  const skills = path.join(dir, 'skills');
  fs.mkdirSync(skills);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(skills, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

{
  const result = checkSkillFrontmatter(ROOT);
  assert.equal(result.ok, true, `repo skills should pass: ${JSON.stringify(result.findings)}`);
  console.log('  ✓ current repo skills pass skill-frontmatter');
}

withTempSkills(
  {
    'bad-skill/SKILL.md': `---
name: bad-skill
description: Trigger words: foo / bar
---

# bad
`,
  },
  (root) => {
    const result = checkSkillFrontmatter(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.level === 'P1' && /must be a quoted string/.test(f.msg)));
    console.log('  ✓ unquoted description fails (must quote)');
  },
);

withTempSkills(
  {
    'bare-ok-text/SKILL.md': `---
name: bare-ok-text
description: Plain text without colon-space still must be quoted
---

# bare
`,
  },
  (root) => {
    const result = checkSkillFrontmatter(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.level === 'P1' && /must be a quoted string/.test(f.msg)));
    console.log('  ✓ unquoted description without ": " still fails');
  },
);

withTempSkills(
  {
    'good-skill/SKILL.md': `---
name: good-skill
description: "Trigger words: foo / bar"
---

# good
`,
  },
  (root) => {
    const result = checkSkillFrontmatter(root);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
    console.log('  ✓ quoted description with ": " passes');
  },
);

withTempSkills(
  {
    'mismatch/SKILL.md': `---
name: mismatch
description: AE/TE gateway Prefer on-demand validate OR dry-run — do not stack."
---

# mismatch
`,
  },
  (root) => {
    const result = checkSkillFrontmatter(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((f) => f.level === 'P1' && /mismatched quotes/.test(f.msg)));
    console.log('  ✓ mismatched description quotes fail');
  },
);

console.log('\nrelease-gate skill-frontmatter tests passed\n');
