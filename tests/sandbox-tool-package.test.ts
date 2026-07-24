import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import JSZip from 'jszip';

import {
  createToolArchive,
  manifestFromNpmPackage,
  parseExactNpmPackageSpec,
  removeTemporaryTree,
  validateToolManifest,
} from '../src/commands/te-system/sandbox-tool-package.js';

const scoped = parseExactNpmPackageSpec('@scope/example-cli@1.2.3-beta.1');
assert.deepEqual(scoped, {
  name: '@scope/example-cli',
  version: '1.2.3-beta.1',
  spec: '@scope/example-cli@1.2.3-beta.1',
});
for (const invalid of [
  'eslint',
  'eslint@latest',
  'eslint@^9.0.0',
  'eslint@https://example.test/eslint.tgz',
  'file:../eslint',
  'npm:eslint@9.0.0',
]) {
  assert.throws(
    () => parseExactNpmPackageSpec(invalid),
    /exact registry package version/,
  );
}

const npmManifest = manifestFromNpmPackage(
  parseExactNpmPackageSpec('example-cli@2.3.4'),
  {
    name: 'example-cli',
    version: '2.3.4',
    description: 'Example CLI',
    bin: {
      example: './bin/example.js',
      'example-admin': 'bin/admin.js',
    },
  },
);
assert.deepEqual(npmManifest.commands, [
  {
    name: 'example',
    entry: 'node_modules/example-cli/bin/example.js',
    runtime: 'node',
  },
  {
    name: 'example-admin',
    entry: 'node_modules/example-cli/bin/admin.js',
    runtime: 'node',
  },
]);
assert.throws(
  () =>
    validateToolManifest({
      ...npmManifest,
      commands: [{ name: 'npm', entry: 'bin/npm.js', runtime: 'node' }],
    }),
  /reserved/,
);
assert.throws(
  () =>
    manifestFromNpmPackage(parseExactNpmPackageSpec('escape-cli@1.0.0'), {
      name: 'escape-cli',
      version: '1.0.0',
      bin: { escape: '../../outside.js' },
    }),
  /must stay inside the package/,
);

const root = mkdtempSync(join(tmpdir(), 'ae-cli-tool-package-test-'));
let createdArchiveDirectory: string | undefined;
try {
  const binTarget = join(
    root,
    'node_modules',
    'example-cli',
    'bin',
    'example.js',
  );
  mkdirSync(dirname(binTarget), { recursive: true });
  writeFileSync(binTarget, '#!/usr/bin/env node\nconsole.log("ok");\n', {
    mode: 0o755,
  });
  const binDirectory = join(root, 'node_modules', '.bin');
  mkdirSync(binDirectory, { recursive: true });
  symlinkSync('../example-cli/bin/example.js', join(binDirectory, 'example'));
  writeFileSync(
    join(root, 'tool.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      name: 'example-cli',
      version: '2.3.4',
      commands: [
        {
          name: 'example',
          entry: 'node_modules/example-cli/bin/example.js',
          runtime: 'node',
        },
      ],
    })}\n`,
  );

  const created = await createToolArchive(root);
  createdArchiveDirectory = dirname(created.archivePath);
  const zip = await JSZip.loadAsync(await readFile(created.archivePath));
  const wrapper = await zip.file('node_modules/.bin/example')?.async('string');
  assert.ok(wrapper);
  assert.match(wrapper, /^#!\/usr\/bin\/env bash/);
  assert.match(wrapper, /example-cli\/bin\/example\.js/);
  const archiveManifest = await zip.file('tool.json')?.async('string');
  assert.ok(archiveManifest);
  assert.equal(JSON.parse(archiveManifest).name, 'example-cli');
} finally {
  if (createdArchiveDirectory) {
    await removeTemporaryTree(createdArchiveDirectory);
  }
  rmSync(root, { recursive: true, force: true });
}

const unsafeRoot = mkdtempSync(join(tmpdir(), 'ae-cli-tool-package-unsafe-'));
try {
  writeFileSync(join(unsafeRoot, 'outside-target'), 'unsafe');
  symlinkSync('outside-target', join(unsafeRoot, 'unsafe-link'));
  writeFileSync(
    join(unsafeRoot, 'tool.json'),
    JSON.stringify({
      schemaVersion: 1,
      name: 'unsafe-tool',
      version: '1.0.0',
      commands: [
        { name: 'unsafe-tool', entry: 'outside-target', runtime: 'native' },
      ],
    }),
  );
  await assert.rejects(
    () => createToolArchive(unsafeRoot),
    /Symbolic links are only allowed under node_modules\/.bin/,
  );
} finally {
  rmSync(unsafeRoot, { recursive: true, force: true });
}

process.stdout.write('sandbox tool package tests passed\n');
