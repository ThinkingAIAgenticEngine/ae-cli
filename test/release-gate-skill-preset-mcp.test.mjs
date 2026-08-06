/**
 * release-gate / skill-preset-mcp unit checks
 * Run: node test/release-gate-skill-preset-mcp.test.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSkillPresetMcp } from '../self-check/checks/skill-preset-mcp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function withTempSkills(files, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-skill-preset-mcp-'));
  const skills = path.join(root, 'skills');
  fs.mkdirSync(skills);
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(skills, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  try {
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const result = checkSkillPresetMcp(ROOT);
  assert.equal(result.ok, true, `repo skills should pass: ${JSON.stringify(result.findings)}`);
  console.log('  ✓ current repo skills contain no AE preset MCP execution fallback');
}

withTempSkills(
  {
    'ae-analysis/SKILL.md': 'Fall back to te-mcp when the command fails.\n',
    'ae-community/SKILL.md': 'Structured reports use MCP tool chains.\n',
  },
  (root) => {
    const result = checkSkillPresetMcp(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => /AE preset MCP identifier/u.test(finding.msg)));
    assert.ok(result.findings.some((finding) => /MCP tool chain/u.test(finding.msg)));
    assert.ok(result.findings.some((finding) => /MCP fallback/u.test(finding.msg)));
    console.log('  ✓ preset identifiers, tool chains, and fallback instructions fail');
  },
);

withTempSkills(
  {
    'ae-agent/SKILL.md': 'Use MCP tools to administer an MCP server.\n',
    'ae-engage/SKILL.md': 'Transport override: `--mcp-url <url>`.\n',
    'ae-data-integration-helper/reference.md': 'source: "Feishu MCP"\n',
    'ae-analysis/SKILL.md': 'Do not fall back to MCP.\n',
  },
  (root) => {
    const result = checkSkillPresetMcp(root);
    assert.equal(result.ok, true, JSON.stringify(result.findings));
    console.log('  ✓ MCP administration, transport, source, and prohibition text stay allowed');
  },
);

console.log('\nrelease-gate skill-preset-mcp tests passed\n');
