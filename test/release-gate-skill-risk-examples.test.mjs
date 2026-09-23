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

await withTempSkills(
  {
    'example/references/command_index.md': `# Commands

| CLI command | Capability ID | Risk | Flags | Reference |
|---|---|---|---|---|
| \`ae-cli example retry\` | example.retry | high-risk-write |  |  |
| \`ae-cli example list\` | example.list | read |  |  |
`,
    'example/references/actions.md': `# Actions

Domain: **Example / read + high-risk-write**

\`\`\`bash
ae-cli --yes example retry --expected-version 1
ae-cli --yes example list
\`\`\`
`,
  },
  async (root) => {
    const result = await run({ root });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1, JSON.stringify(result.findings));
    assert.match(result.findings[0].msg, /actions\.md:7 uses --yes for a read command example/);
    console.log('  ✓ leading global flags retain command-level risk enforcement');
  },
);

await withTempSkills(
  {
    'example/references/table.md': `# Tables

| CLI command | Purpose | Risk | Flags |
|---|---|---|---|
| \`ae-cli dataops_datatable +entity_recycle\` | Recycle one entity | high-risk-write | |
| \`ae-cli dataops_datatable +recycle_bin_list\` | List recycled entities | read | |

\`\`\`bash
ae-cli dataops_datatable +entity_recycle --spaceCode demo --entityId e1 --name orders --yes
\`\`\`
`,
  },
  async (root) => {
    const result = await run({ root });
    assert.equal(result.ok, true, JSON.stringify(result.findings));
    console.log('  ✓ workflow references provide high-risk metadata without a separate index');
  },
);

await withTempSkills(
  {
    'example/references/table.md': `# Tables

| CLI command | Purpose | Risk | Flags |
|---|---|---|---|
| \`ae-cli dataops_datatable +recycle_bin_list\` | List recycled entities | read | |
| \`ae-cli dataops_datatable +create_table\` | Create a table | write | |

\`\`\`bash
ae-cli dataops_datatable +recycle_bin_list --spaceCode demo --yes
ae-cli dataops_datatable +create_table --spaceCode demo --yes
\`\`\`
`,
  },
  async (root) => {
    const result = await run({ root });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 2, JSON.stringify(result.findings));
    assert.match(result.findings[0].msg, /uses --yes for a read command example/);
    assert.match(result.findings[1].msg, /uses --yes for a write command example/);
    console.log('  ✓ workflow metadata still rejects --yes for read and ordinary write examples');
  },
);

await withTempSkills(
  {
    'example/references/table.md': `# Tables

\`\`\`bash
ae-cli dataops_datatable +entity_recycle --spaceCode demo --entityId e1 --name orders --yes
\`\`\`
`,
  },
  async (root) => {
    const result = await run({ root });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1, JSON.stringify(result.findings));
    assert.match(result.findings[0].msg, /uses --yes without high-risk-write metadata/);
    console.log('  ✓ recycling is not implicitly allowed without explicit risk metadata');
  },
);

console.log('\nrelease-gate skill-risk-examples tests passed\n');
