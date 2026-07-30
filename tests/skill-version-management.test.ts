import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';

import type { RuntimeContext } from '../src/framework/types.ts';
import { addSkill } from '../src/commands/te-agent/skills.ts';
import { editSkill, uploadSkill } from '../src/commands/te-agent/skill-content.ts';
import { assertValidSkillVersion } from '../src/commands/te-agent/skill-version.ts';
import { buildSkillZip, pushSkillItems, readSkillVersion } from '../src/commands/sync/index.ts';
import { TeAgentApiError } from '../src/core/te-agent-client.ts';

function context(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => (values[name] === undefined ? undefined : Number(values[name])),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => '',
    mcpUrl: () => undefined,
    service: () => 'agent',
    out: async () => undefined,
  };
}

assert.doesNotThrow(() => assertValidSkillVersion('1.10'));
assert.throws(() => assertValidSkillVersion('1.0.0'), /major\.minor/);
assert.throws(() => assertValidSkillVersion('01.0'), /major\.minor/);

const addContext = context({
  name: 'demo',
  description: 'demo',
  instructions: 'body',
  scope: 'personal',
  version: '1.0',
});
addSkill.validate?.(addContext);
assert.equal((addSkill.dryRun?.(addContext) as any).body.version, '1.0');

assert.throws(
  () => editSkill.validate?.(context({ id: 'skill-id', instructions: 'changed', version: '' })),
  /--version is required/,
);
assert.doesNotThrow(() => editSkill.validate?.(context({ id: 'skill-id', instructions: 'changed', version: '1.1' })));
assert.equal(readSkillVersion('---\nname: demo\nversion: "1.10"\n---\nbody\n'), '1.10');
assert.equal(readSkillVersion('---\nname: demo\n---\nbody\n'), undefined);

const editSkillReference = readFileSync(
  join(process.cwd(), 'skills', 'ae-agent', 'references', 'edit-skill.md'),
  'utf8',
);
const editSkillCommands = editSkillReference
  .split('\n')
  .filter((line) => line.includes('ae-cli agent +edit-skill'));
assert.ok(editSkillCommands.length >= 4);
for (const command of editSkillCommands) {
  if (/--(?:name|description|instructions)\b/.test(command)) {
    assert.match(command, /--version(?:=|\s)\S+/, `Content edit example is missing --version: ${command}`);
  }
}

const editResult = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    'src/index.ts',
    '--no-update-check',
    '--dry-run',
    'agent',
    '+edit-skill',
    '--id',
    'test-skill',
    '--version',
    '2.2',
    '--description',
    'updated description',
  ],
  { encoding: 'utf8' },
);
assert.equal(editResult.status, 0, editResult.stderr);
const editDryRun = JSON.parse(editResult.stdout);
assert.equal(editDryRun.data.body.version, '2.2');
assert.equal(editDryRun.data.body.description, 'updated description');

const root = mkdtempSync(join(tmpdir(), 'ae-cli-skill-version-'));
try {
  mkdirSync(join(root, 'references'), { recursive: true });
  writeFileSync(join(root, 'SKILL.md'), '---\nname: demo\nversion: "1.0"\n---\nbody\n');
  writeFileSync(join(root, 'references', 'guide.md'), '# Guide\n');
  const buffer = await buildSkillZip(root);
  const zipPath = join(root, 'demo.zip');
  writeFileSync(zipPath, buffer);
  assert.throws(
    () =>
      uploadSkill.validate?.(
        context({
          file: zipPath,
          replaceSkillId: 'skill-id',
          scope: 'personal',
        }),
      ),
    /--version is required/,
  );
  assert.doesNotThrow(() =>
    uploadSkill.validate?.(
      context({
        file: zipPath,
        replaceSkillId: 'skill-id',
        scope: 'personal',
        version: '1.1',
      }),
    ),
  );
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file('SKILL.md'));
  assert.ok(zip.file('references/guide.md'));

  const firstSkillDir = join(root, 'first-skill');
  const secondSkillDir = join(root, 'second-skill');
  mkdirSync(firstSkillDir);
  mkdirSync(secondSkillDir);
  const firstContent = '---\nname: first-skill\nversion: "1.1"\n---\nfirst\n';
  const secondContent = '---\nname: second-skill\nversion: "2.0"\n---\nsecond\n';
  writeFileSync(join(firstSkillDir, 'SKILL.md'), firstContent);
  writeFileSync(join(secondSkillDir, 'SKILL.md'), secondContent);

  const uploads: Array<{ path: string; slug: string; source: string; version: string; workspacePath: string }> = [];
  const manifestUpdates: string[] = [];
  const pushResult = await pushSkillItems(
    [
      {
        kind: 'skill',
        slug: 'first-skill',
        scope: 'personal',
        source: 'workspace',
        workspacePath: 'demo-workspace',
        event: 'upsert',
        dirPath: firstSkillDir,
        content: firstContent,
        checksum: 'first-checksum',
        mtime: new Date(0).toISOString(),
      },
      {
        kind: 'skill',
        slug: 'second-skill',
        scope: 'personal',
        source: 'global',
        event: 'upsert',
        dirPath: secondSkillDir,
        content: secondContent,
        checksum: 'second-checksum',
        mtime: new Date(0).toISOString(),
      },
    ],
    {
      upload: async (path, formData) => {
        const slug = String(formData.get('slug'));
        uploads.push({
          path,
          slug,
          source: String(formData.get('source')),
          version: String(formData.get('version')),
          workspacePath: String(formData.get('workspacePath') ?? ''),
        });
        assert.ok(formData.get('file') instanceof Blob);
        if (slug === 'second-skill') {
          throw new TeAgentApiError('Version conflict', 409, 'version_conflict');
        }
        return { item: { id: 'first-id' }, workspaceEnabled: false };
      },
      updateManifest: (_sourceDir, slug) => {
        manifestUpdates.push(slug);
      },
    },
  );
  assert.deepEqual(uploads, [
    {
      path: '/api/sandbox/sync/push/skill',
      slug: 'first-skill',
      source: 'workspace',
      version: '1.1',
      workspacePath: 'demo-workspace',
    },
    {
      path: '/api/sandbox/sync/push/skill',
      slug: 'second-skill',
      source: 'global',
      version: '2.0',
      workspacePath: '',
    },
  ]);
  assert.deepEqual(manifestUpdates, ['first-skill']);
  assert.deepEqual(pushResult.results, [
    {
      kind: 'skill',
      slug: 'first-skill',
      status: 'synced',
      message: 'Skill synced, but it was not enabled in the current workspace',
    },
    {
      kind: 'skill',
      slug: 'second-skill',
      status: 'failed',
      message: 'version_conflict Version conflict',
    },
  ]);

  writeFileSync(join(root, 'SKILL.md'), 'x'.repeat(1_048_577));
  await assert.rejects(() => buildSkillZip(root), /must not exceed 1 MB/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

process.stdout.write('skill version management tests passed\n');
