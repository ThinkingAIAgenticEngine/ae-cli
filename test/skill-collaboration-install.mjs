// Explicit networked packaging check, separate from offline regression tests.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const root = mkdtempSync(path.join(tmpdir(), 'skill-collaboration-install-'));
try {
  for (const name of [
    'ae-analysis', 'ae-capability', 'ae-community', 'ae-data-integration', 'ae-dataops',
    'ae-engage', 'ae-generate-tracking-plan', 'ae-kb', 'ae-kb-discovery', 'ae-metadata',
  ]) {
    for (const mode of ['copy', 'symlink']) {
      const project = path.join(root, `${name}-${mode}`);
      mkdirSync(project);
      const source = path.join(repositoryRoot, 'skills', name);
      const result = spawnSync('npm', ['exec', '--yes', '--registry=https://registry.npmjs.org',
        '--package=skills@1.7.0', '--', 'skills', 'add', source,
        '--agent', 'claude-code', '--yes', ...(mode === 'copy' ? ['--copy'] : [])], {
        cwd: project, encoding: 'utf8', timeout: 120_000,
        env: { ...process.env, DISABLE_TELEMETRY: '1', NO_COLOR: '1' },
      });
      assert.equal(result.status, 0, result.error?.message ?? `${result.stdout}\n${result.stderr}`);
      const installed = path.join(project, '.claude/skills', name);
      const actualPath = realpathSync(installed);
      assert.ok(actualPath.startsWith(`${realpathSync(project)}${path.sep}`));
      assert.equal(readFileSync(path.join(installed, 'references/collaboration.md'), 'utf8'),
        readFileSync(path.join(source, 'references/collaboration.md'), 'utf8'));
      assert.match(readFileSync(path.join(installed, 'SKILL.md'), 'utf8'), /\]\(references\/collaboration\.md\)/);
      assert.equal(existsSync(path.join(project, 'docs/skill-contracts')), false);
      console.log(`PASS skills@1.7.0 ${name} ${mode}: installed protocol is self-contained`);
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
