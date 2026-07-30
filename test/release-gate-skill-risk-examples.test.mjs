/**
 * release-gate / skill-risk-examples unit checks
 * Run: node test/release-gate-skill-risk-examples.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../self-check/checks/skill-risk-examples.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function withTempSkills(files, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-skill-risk-'));
  const skills = path.join(root, 'skills');
  fs.mkdirSync(skills);
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(skills, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  try {
    await fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const result = await run({ root: ROOT });
  assert.equal(result.ok, true, `repo skills should pass: ${JSON.stringify(result.findings)}`);
  console.log('  ✓ current repo skills pass skill-risk-examples');
}

await withTempSkills(
  {
    'example/references/command_index.md': `# Commands

| CLI command | Capability ID | Risk | Flags | Reference |
|---|---|---|---|---|
| \`ae-cli system admin upsert\` | system.admin.upsert | high-risk-write |  |  |
| \`ae-cli system smtp test\` | system.smtp.test | write |  |  |
`,
    'example/references/admin.md': `# Admin

\`\`\`bash
ae-cli system admin upsert --company-id 1 --yes
\`\`\`
`,
    'example/references/smtp.md': `# SMTP

\`\`\`bash
ae-cli system smtp test --company-id 1 --receiver ops@example.com --yes
\`\`\`
`,
  },
  async (root) => {
    const result = await run({ root });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1, JSON.stringify(result.findings));
    assert.match(result.findings[0].msg, /smtp\.md:4 uses --yes for a write command example/);
    console.log('  ✓ risk metadata allows high-risk non-delete commands and rejects ordinary writes');
  },
);

console.log('\nrelease-gate skill-risk-examples tests passed\n');
